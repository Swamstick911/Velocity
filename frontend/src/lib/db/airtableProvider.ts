import { IDatabaseProvider, DatabaseOptions } from "./types";
import { Submission } from "@/components/ReviewerDashboard";

export class AirtableProvider implements IDatabaseProvider {
    async getSubmissionsQueue(options?: DatabaseOptions): Promise<Submission[]> {
        const token = options?.airtableToken || process.env.AIRTABLE_TOKEN;
        const baseId = options?.airtableBaseId || process.env.AIRTABLE_BASE_ID;
        const table = options?.airtableTableName || process.env.AIRTABLE_TABLE_NAME;
        return [];
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
        return true;
    }

    async getRepoStats(githubUrl: string): Promise<any> {
        return null;
    }
}