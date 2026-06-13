import { IDatabaseProvider, DatabaseOptions } from "./types";
import { Submission } from "@/components/ReviewerDashboard";

export class PostgresProvider implements IDatabaseProvider {
    async getSubmissionsQueue(options?: DatabaseOptions): Promise<Submission[]> {
        return [];
    }

    async updateSubmissionStatus(
        id: string, 
        status: string, 
        publicComment: string, 
        privateComment: string,
        options?: DatabaseOptions
    ): Promise<boolean> {
        return true;
    }

    async getRepoStats(githubUrl: string): Promise<any> {
        return null;
    }
}