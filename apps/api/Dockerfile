FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++ libc6-compat
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/prisma/package.json ./packages/prisma/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY packages/utils/package.json ./packages/utils/package.json
COPY packages/ts-config/package.json ./packages/ts-config/package.json
RUN pnpm install --frozen-lockfile --prod=false

FROM deps AS development
WORKDIR /app
COPY . .
RUN pnpm --filter @pollbooth/prisma generate
EXPOSE 3001
CMD ["pnpm", "--filter", "@pollbooth/api", "dev"]

FROM deps AS production
WORKDIR /app
COPY . .
RUN pnpm --filter @pollbooth/prisma generate
RUN pnpm --filter @pollbooth/api build
ENV NODE_ENV=production
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/server.js"]
