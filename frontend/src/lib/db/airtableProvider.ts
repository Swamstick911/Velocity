import { IDatabaseProvider, DatabaseOptions } from "./types";
import { Submission } from "@/components/ReviewerDashboard";

export class AirtableProvider implements IDatabaseProvider {
    async getSubmissionsQueue(options?: DatabaseOptions): Promise<Submission[]> {
        const token = options?.airtableToken || process.env.AIRTABLE_TOKEN;
        const baseId = options?.airtableBaseId || process.env.AIRTABLE_BASE_ID;
        const table = options?.airtableTableName || process.env.AIRTABLE_TABLE_NAME;

        if (!token || !baseId || !table) {
            throw new Error("Missing Airtable credentials");
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

        return (data.records || []).map((record: any) => ({
            id: record.id,
            github_url: record.fields["GitHub URL"] || record.fields["github_url"] || "",
            playable_url: record.fields["Playable URL"] || record.fields["playable_url"] || "",
            target_program: record.fields["Target Program"] || record.fields["target_program"] || "Unknown",
            status: record.fields["Status"] || record.fields["status"] || "pending",
            birth_year: record.fields["Birth Year"] || record.fields["birth_year"] || null,
            description: record.fields["Description"] || record.fields["description"] || record.fields["Project Description"] || record.fields["project_description"] || "",
            public_comment: record.fields["Public Comment"] || record.fields["public_comment"] || "",
            private_comment: record.fields["Private Comment"] || record.fields["private_comment"] || "",
            hackatime_hours: record.fields["Hackatime Hours"] ?? record.fields["hackatime_hours"] ?? record.fields["Hours"] ?? null,
            hackatime_projects: record.fields["Hackatime Projects"] || record.fields["hackatime_projects"] || record.fields["Project Names"] || [],
        }));
    }

    async updateSubmissionStatus(
        id: string, 
        status: string, 
        publicComment: string, 
        privateComment: string,
        options?: DatabaseOptions
    ): Promise<boolean> {
        const token = options?.airtableToken || process.env.AIRTABLE_TOKEN;
        const baseId = options?.airtableBaseId || process.env.AIRTABLE_BASE_ID;
        const table = options?.airtableTableName || process.env.AIRTABLE_TABLE_NAME;
        
        if (!token || !baseId || !table) {
            throw new Error("Missing Airtable credentials");
        }

        const fields: Record<string, any> = {
            Status: status,
        };

        if(typeof publicComment === "string") {
            fields["Public Comment"] = publicComment;
        }

        if (typeof privateComment === "string") {
            fields["Private Comment"] = privateComment;
        }

        const response = await fetch(
            `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}/${id}`,
            {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ fields }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data?.error?.message || "Failed to update Airtable")
        }

        return true;
    }

    async getRepoStats(githubUrl: string): Promise<any> {
        return null;
    }
}