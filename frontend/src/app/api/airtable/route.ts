import { NextResponse, NextRequest } from "next/server";

const AIRTABLE_API_BASE = "https://api.airtable.com/v0";
export const dynamic = 'force-dynamic';

function jsonError(message: string, status = 500, details?: unknown) {
    return NextResponse.json(
        {
            ok: false,
            error: message,
            details: details ?? null, 
        },
        { status }
    );
}

function normalizeWithMapping(record: any, m: Record<string, string | null>) {
    const f = record?.fields ?? {};
    const get = (key: string) => (m[key] ? f[m[key] as string] : undefined);
    return {
        id: record?.id ?? "",
        github_url: get("github_url") ?? "",
        playable_url: get("playable_url") ?? "",
        target_program: get("target_program") ?? "Unknown",
        status: get("status") ?? "pending",
        birth_year: get("birth_year") ?? null,
        description: get("description") ?? "",
        public_comment: get("public_comment") ?? "",
        private_comment: get("private_comment") ?? "",
        hackatime_hours: get("hackatime_hours") ?? null,
        hackatime_projects: get("hackatime_projects") ?? [],
        slack_id: get("slack_id") ?? null,
    };
}

function collectColumns(records: any[]): string[] {
    const cols = new Set<string>();
    for (const r of records) for (const k of Object.keys(r?.fields ?? {})) cols.add(k);
    return [...cols];
}

function detectColumns(records: any[], usingHackatime: boolean): Record<string, string | null> {
    const cols = collectColumns(records);

    // sample up to 25 non-empty values per column
    const samples: Record<string, any[]> = {};
    for (const c of cols) samples[c] = [];
    for (const r of records.slice(0, 40)) {
        const f = r?.fields ?? {};
        for (const c of cols) {
            const v = f[c];
            if (v !== undefined && v !== null && v !== "" && samples[c].length < 25) samples[c].push(v);
        }
    }

    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const asStr = (v: any) => (Array.isArray(v) ? v.join(" ") : String(v ?? "")).trim();
    const isUrl = (v: any) => /^https?:\/\//i.test(asStr(v));
    const isGithub = (v: any) => /github\.com/i.test(asStr(v));
    const frac = (c: string, test: (v: any) => boolean) =>
        samples[c].length ? samples[c].filter(test).length / samples[c].length : 0;

    const fields: { key: string; kw: string[]; val: (v: any) => boolean }[] = [
        { key: "github_url", kw: ["github","githuburl","repo","repository","codeurl","sourceurl"], val: isGithub },
        { key: "playable_url", kw: ["playable","playableurl","demo","demourl","liveurl","livelink","livedemo","deployedurl","deployment","preview","projecturl","url","link","website","site"], val: (v) => isUrl(v) && !isGithub(v) },
        { key: "birth_year", kw: ["birthyear","birth","yearofbirth","dob","age"], val: (v) => { const n = parseInt(asStr(v), 10); return !isNaN(n) && n >= 1900 && n <= new Date().getFullYear() - 10; } },
        { key: "slack_id", kw: ["slackid","slack","slackmemberid","slackuser"], val: (v) => /^U[A-Z0-9]{6,}$/.test(asStr(v)) },
        { key: "target_program", kw: ["targetprogram","program","programname","ysws","track","event"], val: (v) => !isUrl(v) && asStr(v).length > 0 && asStr(v).length < 60 },
        { key: "status", kw: ["status","state","decision","reviewstatus"], val: (v) => ["pending","approved","rejected","clean","flagged","accepted","denied"].includes(asStr(v).toLowerCase()) },
        { key: "description", kw: ["description","about","summary","blurb","projectdescription","details"], val: () => false },
        { key: "public_comment", kw: ["publiccomment","feedback","publicnote","reviewercomment"], val: () => false },
    ];
    if (usingHackatime) {
        fields.push(
            { key: "hackatime_hours", kw: ["hackatimehours","hours","timetracked","hackatime"], val: (v) => !isNaN(parseFloat(asStr(v))) },
            { key: "hackatime_projects", kw: ["hackatimeprojects","projects","projectnames"], val: (v) => asStr(v).length > 0 && !isUrl(v) },
        );
    }

    const score = (fld: typeof fields[number], col: string) => {
        const n = norm(col);
        let s = 0;
        if (fld.kw.includes(n)) s += 30;
        else if (fld.kw.some((k) => n.includes(k))) s += 15;
        s += frac(col, fld.val) * 12;
        return s;
    };

    const used = new Set<string>();
    const mapping: Record<string, string | null> = {};
    for (const fld of fields) {
        let best: string | null = null, bestScore = 0;
        for (const col of cols) {
            if (used.has(col)) continue;
            const sc = score(fld, col);
            if (sc > bestScore) {
                bestScore = sc;
                best = col;
            }
        }
        if (best && bestScore >= 12) { mapping[fld.key] = best; used.add(best); }
        else mapping[fld.key] = null;
    }
    return mapping;
}

async function fetchAirtableRecords (
    airtableToken: string,
    airtableBaseId: string,
    airtableTableName: string
) {
    const encodedTable = encodeURIComponent(airtableTableName);
    const url = `${AIRTABLE_API_BASE}/${airtableBaseId}/${encodedTable}`;

    const res = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${airtableToken}`,
            "Content-Type": "application/json",
        },
        cache: "no-store",
    });

    if(!res.ok) {
        let details: unknown = null;

        try {
            details = await res.json();
        } catch {
            details = await res.text().catch(() => null);
        }

        throw {
            status: res.status,
            message: "Failed to fetch Airtable queue",
            details,
        };
    }

    const data = await res.json();
    const records = Array.isArray(data?.records) ? data.records : [];

    return records;
}

async function updateAirtableRecord(
    airtableToken: string,
    airtableBaseId: string,
    airtableTableName: string,
    recordId: string,
    fields: Record<string, unknown>
) {
    const encodedTable = encodeURIComponent(airtableTableName);
    const url = `${AIRTABLE_API_BASE}/${airtableBaseId}/${encodedTable}/${recordId}`;

    const res = await fetch(url, {
        method: "PATCH",
        headers: { 
            Authorization: `Bearer ${airtableToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields }),
        cache: "no-store",
    });

    if(!res.ok) {
        let details: unknown = null;
        
        try {
            details = await res.json();
        } catch {
            details = await res.text().catch(() =>null);
        }

        throw {
            status: res.status,
            message: "failed to update Airtable record",
            details,
        };
    }

    return res.json();
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const {
            id,
            status,
            publicComment,
            privateComment,
            airtableToken,
            airtableBaseId,
            airtableTableName,
            columnMapping,
            usingHackatime,
        } = body ?? {};

        if(!airtableToken || !airtableBaseId || !airtableTableName) {
            return jsonError("Misssing Airtable Configuration", 400);
        }

        if(id && status) {
            const updated = await updateAirtableRecord(
                airtableToken,
                airtableBaseId,
                airtableTableName,
                id,
                {
                    Status: status,
                    "Public Comment": publicComment ?? "",
                    "Private Comment": privateComment ?? "",
                }
            );

            return NextResponse.json({
                ok: true,
                mode: "update",
                record: updated,
            });
        }

        const records = await fetchAirtableRecords(
            airtableToken,
            airtableBaseId,
            airtableTableName
        );

        const columns = collectColumns(records);
        const mapping = columnMapping ?? detectColumns(records, usingHackatime !== false);
        const submissions = records.map((r: any) => normalizeWithMapping(r, mapping));

        return NextResponse.json({
            ok: true,
            mode: "queue",
            submissions,
            columnMapping: mapping,
            columns,
        });
    } catch (error: any) {
        console.error("Airtable route error:" , error);

        const status =
            typeof error?.status === "number" && error.status >= 400
                ? error.status
                : 500;
                
        return jsonError(
            error?.message || "Unexpected Airtable route failure",
            status,
            error?.details ?? null
        );
    }
}

export async function GET() {
    return jsonError(
        "GET is not supported on this route. Use POST with Airtable credenctials",
        405
    );
}