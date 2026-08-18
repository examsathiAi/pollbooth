FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY packages/utils/package.json ./packages/utils/package.json
COPY packages/ts-config/package.json ./packages/ts-config/package.json
RUN pnpm install --frozen-lockfile --prod=false

FROM deps AS development
WORKDIR /app
COPY . .
EXPOSE 3000
CMD ["pnpm", "--filter", "@pollbooth/web", "dev"]

FROM deps AS production
WORKDIR /app
COPY . .
RUN pnpm --filter @pollbooth/web build
ENV NODE_ENV=production
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["pnpm", "start"]
