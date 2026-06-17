import { NextRequest, NextResponse } from "next/server";

const HACKATIME_API = "https://hackatime.hackclub.dev/api";

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

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { username } = body ?? {};

        if (!username) {
            return jsonError("Missing GitHub username for Hackatime check", 400);
        }

        const cleanUsername = username.trim().replace(/^@/, "");

        const url = `${HACKATIME_API}/users/${cleanUsername}/stats`;

        const res = await fetch(url, {
            method: "GET",
            headers: {
                "Accept": "application/json",
            },
            next: { revalidate: 300 },
        });

        if (!res.ok) {
            let details: unknown = null;
            try {
                details = await res.json();
            } catch {
                details = await res.text().catch(() => null);
            }

            if(res.status === 404) {
                return NextResponse.json({
                    ok: true,
                    stats: { hours: 0, projects: [] },
                    isRegistered: false,
                });
            }

            throw {
                status: res.status,
                message: "Failed to fetch Hackatime stats",
                details,
            };
        }

        const data = await res.json();

        const hours = data?.data?.total_seconds ? Math.round(data.data.total_seconds / 3600) : 0;
        const projects = Array.isArray(data?.data?.projects)
            ? data.data.projects.map((p: any) => p?.name).filter(Boolean)
            : [];

        return NextResponse.json({
            ok: true,
            stats: { hours, projects },
            isRegistered: true,
        });
    } catch (error: any) {
        console.error("Hackatime route error:", error);

        const status = typeof error?.status === "number" && error.status >= 400 ? error.status: 500;

        return jsonError(
            error?.message || "Unexpected Hackatime API failure",
            status,
            error?.details ?? null
        );
    }
}

export async function GET(){
    return jsonError(
        "GET is not supported. Use POST with { username: string }",
        405
    );
}