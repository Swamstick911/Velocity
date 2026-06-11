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
            `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`,
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
            description:
                record.fields["Description"] ||
                record.fields["description"] ||
                record.fields["Project Description"] ||
                record.fields["project_description"] ||
                "",
            public_comment:
                record.fields["Public Comment"] ||
                record.fields["public_comment"] ||
                "",
            private_comment:
                record.fields["Private Comment"] ||
                record.fields["private_comment"] ||
                "",
            hackatime_hours:
                record.fields["Hackatime Hours"] ??
                record.fields["hackatime_hours"] ??
                record.fields["Hours"] ??
                null,
            hackatime_projects:
                record.fields["Hackatime Projects"] ||
                record.fields["hackatime_projects"] ||
                record.fields["Project Names"] ||
                [],
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
            publicComment,
            privateComment,
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

        const fields: Record<string, any> = {
            Status: status,
        };

        if (typeof publicComment === "string") {
            fields["Public Comment"] = publicComment;
        }

        if (typeof privateComment === "string") {
            fields["Private Comment"] = publicComment;
        }

        const response = await fetch(
            `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent(airtableTableName)}/${id}`,
            {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${airtableToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ fields }),
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