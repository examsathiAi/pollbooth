import { PrismaClient } from "@prisma/client";
import { config } from "./index";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: config.isDevelopment ? ["query", "error", "warn"] : ["error"],
  datasources: {
    db: {
      url: config.databaseUrl,
    },
  },
});

if (config.isDevelopment) globalForPrisma.prisma = prisma;
