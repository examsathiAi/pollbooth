FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/admin/package.json ./apps/admin/package.json
COPY packages/ts-config/package.json ./packages/ts-config/package.json
RUN pnpm install --frozen-lockfile --prod=false

FROM deps AS development
WORKDIR /app
COPY . .
EXPOSE 3002
CMD ["pnpm", "--filter", "@pollbooth/admin", "dev"]

FROM deps AS production
WORKDIR /app
COPY . .
RUN pnpm --filter @pollbooth/admin build
ENV NODE_ENV=production
WORKDIR /app/apps/admin
EXPOSE 3002
CMD ["pnpm", "start"]
