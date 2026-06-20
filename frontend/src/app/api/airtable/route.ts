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

function normalizeSubmission(record: any) {
    const fields = record?.fields ?? {};

    return {
        id: record?.id ?? "",
        github_url: fields["GitHub URL"] ?? fields["Github URL"] ?? fields["github_url"] ?? "",
        playable_url: fields["Playable URL"] ?? fields["playable_url"] ?? "",
        target_program: fields["Target Program"] ?? fields["target_program"] ?? "Unknown",
        status: fields["Status"] ?? fields["status"] ?? "pending",
        birth_year: fields["Birth Year"] ?? fields["birth_year"] ?? null,
        description: fields["Description"] ?? fields["description"] ?? "",
        public_comment: fields["Public Comment"] ?? fields["public_comment"] ?? "",
        private_comment: fields["Private Comment"] ?? fields["private_comment"] ?? "",
        hackatime_hours: fields["Hackatime Hours"] ?? fields["hackatime_hours"] ?? null,
        hackatime_projects: fields["Hackatime Projects"] ?? fields["hackatime_projects"] ?? [],
    };
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

    return records.map(normalizeSubmission);
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

        const submissions = await fetchAirtableRecords(
            airtableToken,
            airtableBaseId,
            airtableTableName
        );

        return NextResponse.json({
            ok: true,
            mode: "queue",
            submissions,
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