import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get("airtableToken");
        const baseId = searchParams.get("airtableBaseId");
        const table = searchParams.get("airtableTableName");

        if(!token || !baseId || !table) {
            return NextResponse.json(
                { error: "Missing Airtable credentials in request" },
                { status: 400 }
            );
        }

        const response = await fetch(
            `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?view=Grid%20view`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                cache: "no-store",
            }
        );

        const data = await response.json();

        if(!response.ok) {
            throw new Error(data?.error?.message || "Failed to fetch data from Airtable");
        }

        const submissions = (data.records || []).map((record: any) => ({
            id: record.id,
            github_url:
                record.fields["GitHub URL"] ||
                record.fields["github_url"] ||
                "",
            playable_url:
                record.fields["Playable URL"] ||
                record.fields["playable_url"] ||
                "",
            target_program:
                record.fields["Target Program"] ||
                record.fields["target_program"] ||
                "Unknown",
            status:
                record.fields["Status"] ||
                record.fields["status"] ||
                "pending",
            birth_year:
                record.fields["Birth Year"] ||
                record.fields["birth_year"] ||
                null,
        }));

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
            airtableToken,
            airtableBaseId,
            airtableTableName,
        } = body;

        if(!id || !status || !airtableToken || !airtableBaseId || !airtableTableName) {
            return NextResponse.json(
                { error: "Missing required fields or credentials" },
                { status: 400 }
            );
        }

        const response = await fetch(
            `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent(airtableTableName)}/${id}`,
            {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${airtableToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    fields: {
                        Status: status,
                    },
                }),
            }
        );

        const data = await response.json();

        if(!response.ok) {
            throw new Error(data?.error?.message || "Failed to update Airtable");
        }

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}