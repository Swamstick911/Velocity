import { NextResponse } from "next/server";
import { dbProvider } from "@/lib/db";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get("airtableToken");
        const baseId = searchParams.get("airtableBaseId");
        const table = searchParams.get("airtableTableName");

        // If running in postgres mode, we don't strictly require these dynamic credentials
        const isPostgres = process.env.DATABASE_TYPE === "postgres";

        if (!isPostgres && (!token || !baseId || !table)) {
            return NextResponse.json(
                { error: "Missing Airtable credentials in request" },
                { status: 400 }
            );
        }

        const submissions = await dbProvider.getSubmissionsQueue({
            airtableToken: token || undefined,
            airtableBaseId: baseId || undefined,
            airtableTableName: table || undefined
        });

        return NextResponse.json(submissions);
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            id,
            status,
            publicComment,
            privateComment,
            airtableToken,
            airtableBaseId,
            airtableTableName,
        } = body;

        const isPostgres = process.env.DATABASE_TYPE === "postgres";

        if (!id || !status) {
            return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
        }

        if (!isPostgres && (!airtableToken || !airtableBaseId || !airtableTableName)) {
            return NextResponse.json(
                { error: "Missing required credentials for Airtable engine storage" },
                { status: 400 }
            );
        }

        const success = await dbProvider.updateSubmissionStatus(
            id,
            status,
            publicComment || "",
            privateComment || "",
            {
                airtableToken,
                airtableBaseId,
                airtableTableName
            }
        );

        if (!success) {
            throw new Error("The target database provider rejected or failed the write operation.");
        }

        return NextResponse.json({ success: true, status });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}