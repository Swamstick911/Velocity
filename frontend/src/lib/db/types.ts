import { Submission } from "@/components/ReviewerDashboard";

export interface DatabaseOptions {
    airtableToken?: string;
    airtableBaseId?: string;
    airtableTableName: string;
}

export interface IDatabaseProvider {
    getSubmissionsQueue(): Promise<Submission[]>;
    updateSubmissionStatus(
        id: string, 
        status: string, 
        publicComment: string, 
        privateComment: string,
        options?: DatabaseOptions
    ): Promise<boolean>;
    getRepoStats(githubUrl: string): Promise<any>;
}