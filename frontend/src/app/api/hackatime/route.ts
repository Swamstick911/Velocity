import { NextResponse } from "next/server";
import { dbProvider } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { submissionId, githubUrl } = body;

        if(!githubUrl) {
            return NextResponse.json({ error: "Missing githubUrl parameter" }, { status: 400 });
        }

        //Extract owner and repo name from the Github URL
        const urlParts = githubUrl.replace("https://github.com/", "").split("/");
        const owner = urlParts[0];
        const repo = urlParts[1];

        if(!owner || !repo) {
            return NextResponse.json({ error: "Invalid githubUrl structure" }, { status: 400 })
        }

        const response = await fetch(
            `https://hackatime.hackclub.com/api/v1/stats/public/projects/${repo}`,
            { cache: "no-store" }
        );

        if (!response.ok) {
            return NextResponse.json(
                { error: `Hackatime metrics could not be located for the project: ${repo}` },
                { status: response.status }
            );
        }

        const data = await response.json();

        const totalSeconds = data?.data?.total_seconds || 0;
        const mappedHours = parseFloat((totalSeconds / 3600).toFixed(2));

        if(submissionId) {
            const isPostgres = process.env.DATABASE_TYPE === "postgres";
            if (isPostgres) {
                const { db } = await import("@/lib/prisma");
                await db.submission.update({
                    where: { id: submissionId },
                    data: {
                        hackatime_hours: mappedHours,
                        hackatime_projects: [repo]
                    }
                });
            }
        }

        return NextResponse.json({
            project: repo,
            hours: mappedHours,
            raw: data?.data
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Internal server error during Hackatime collection" },
            { status: 500 }
        );
    }
}