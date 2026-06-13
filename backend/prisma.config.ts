/// <reference types="node" />
import "dotenv/config";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing from your .env file inside the backend folder.");
}

export default {
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl,
  },
};