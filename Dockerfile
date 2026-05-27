FROM node:20-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/design-system/package.json packages/design-system/package.json
COPY packages/report/package.json packages/report/package.json
COPY packages/schema/package.json packages/schema/package.json

RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app

COPY --from=deps /app ./
COPY . .

RUN pnpm --filter @navigator/web build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /app ./

EXPOSE 3000

CMD ["pnpm", "--filter", "@navigator/web", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]
