# Stage 1: Dependencies + Build
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++ cairo-dev pango-dev giflib-dev

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/
COPY packages/prisma/package.json packages/prisma/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/utils/package.json packages/utils/
COPY packages/ts-config/package.json packages/ts-config/
COPY packages/eslint-config/package.json packages/eslint-config/

RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm db:generate
RUN pnpm --filter @pulse/api build

# Stage 2: Runtime (slim)
FROM node:20-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache dumb-init cairo pango giflib

ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/prisma/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/packages/prisma/schema.prisma ./schema.prisma

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health',(r)=>r.statusCode===200?process.exit(0):process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]

# Development target
FROM builder AS development
WORKDIR /app/apps/api
CMD ["pnpm", "dev"]
