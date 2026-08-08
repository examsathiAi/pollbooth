"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
var client_1 = require("@prisma/client");
var index_1 = require("./index");
var globalForPrisma = globalThis;
exports.prisma = globalForPrisma.prisma || new client_1.PrismaClient({
    log: index_1.config.isDevelopment ? ["query", "error", "warn"] : ["error"],
    datasources: {
        db: {
            url: index_1.config.databaseUrl,
        },
    },
});
if (index_1.config.isDevelopment)
    globalForPrisma.prisma = exports.prisma;
