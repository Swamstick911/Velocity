import { AirtableProvider } from "./airtableProvider";
import { PostgresProvider } from "./postgresProvider";
import { IDatabaseProvider } from "./types";

export const dbProvider: IDatabaseProvider =
    process.env.DATABASE_TYPE === "postgres"
        ? new PostgresProvider()
        : new AirtableProvider();