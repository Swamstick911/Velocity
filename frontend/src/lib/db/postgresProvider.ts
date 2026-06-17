import { IDatabaseProvider, DatabaseOptions } from "./types";
import { Submission } from "@/components/ReviewerDashboard";
import { db } from "@/lib/prisma";

export class PostgresProvider implements IDatabaseProvider {
    async getSubmissionsQueue(options?: DatabaseOptions): Promise<Submission[]> {
        const records = await db.submission.findMany({
            orderBy: { createdAt: "asc" }
        });

        return records.map((record: any) => ({
            id: record.id,
            github_url: record.github_url,
            playable_url: record.playable_url,
            target_program: record.target_program,
            status: record.status,
            birth_year: record.birth_year,
            description: record.description,
            public_comment: record.public_comment,
            private_comment: record.private_comment,
            hackatime_hours: record.hackatime_hours,
            hackatime_projects: record.hackatime_projects,
        }));
    }

    async updateSubmissionStatus(
        id: string, 
        status: string, 
        publicComment: string, 
        privateComment: string,
        options?: DatabaseOptions
    ): Promise<boolean> {
        await db.submission.update({
            where: { id },
            data: {
                status,
                public_comment: publicComment,
                private_comment: privateComment
            }
        });
        return true;
    }

    async getRepoStats(githubUrl: string): Promise<any> {
        return null;
    }
}