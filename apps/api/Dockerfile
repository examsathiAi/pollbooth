FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++ libc6-compat
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/prisma/package.json ./packages/prisma/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY packages/utils/package.json ./packages/utils/package.json
COPY packages/ts-config/package.json ./packages/ts-config/package.json
RUN corepack enable && pnpm install --frozen-lockfile --prod=false

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app /app
COPY . .
RUN pnpm db:generate
RUN pnpm --filter @pulse/api build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S pulse -G nodejs
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/prisma ./packages/prisma
COPY --from=build /app/packages/shared-types ./packages/shared-types
COPY --from=build /app/packages/utils ./packages/utils
COPY --from=build /app/packages/ts-config ./packages/ts-config
WORKDIR /app/apps/api
USER pulse
EXPOSE 3001
CMD ["node", "dist/server.js"]
