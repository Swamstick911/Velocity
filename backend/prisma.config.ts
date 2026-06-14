import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma", // Keep whatever schema path you already have here
  datasource: {
    // Switch from env("DATABASE_URL") to standard process.env with a placeholder string
    url: process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/velocity_db",
  },
});