// @ts-ignore
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

const isBuilding = process.env.NEXT_PHASE === 'phase-production-build';

export const db = isBuilding
    ? (new Proxy({}, { get: () => () => Promise.resolve(null) }) as unknown as PrismaClient)
    : globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production" && !isBuilding) {
    globalForPrisma.prisma = db;
}