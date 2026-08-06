FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/admin/package.json ./apps/admin/package.json
COPY packages/ts-config/package.json ./packages/ts-config/package.json
RUN corepack enable && pnpm install --frozen-lockfile --prod=false

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app /app
COPY . .
RUN pnpm --filter @pulse/admin build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S pulse -G nodejs
COPY --from=build /app/apps/admin/package.json ./apps/admin/package.json
COPY --from=build /app/apps/admin/.next ./apps/admin/.next
COPY --from=build /app/apps/admin/public ./apps/admin/public
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/ts-config ./packages/ts-config
WORKDIR /app/apps/admin
USER pulse
EXPOSE 3002
CMD ["pnpm", "start"]
