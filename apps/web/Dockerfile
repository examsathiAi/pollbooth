FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY packages/utils/package.json ./packages/utils/package.json
COPY packages/ts-config/package.json ./packages/ts-config/package.json
RUN corepack enable && pnpm install --frozen-lockfile --prod=false

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app /app
COPY . .
RUN pnpm --filter @pulse/web build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S pulse -G nodejs
COPY --from=build /app/apps/web/package.json ./apps/web/package.json
COPY --from=build /app/apps/web/.next ./apps/web/.next
COPY --from=build /app/apps/web/public ./apps/web/public
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared-types ./packages/shared-types
COPY --from=build /app/packages/utils ./packages/utils
COPY --from=build /app/packages/ts-config ./packages/ts-config
WORKDIR /app/apps/web
USER pulse
EXPOSE 3000
CMD ["pnpm", "start"]
