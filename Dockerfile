FROM node:20-alpine AS base

# libc6-compat is required on Alpine for Next.js and packages that use native
# bindings (canvas, sharp, pglite). Without it, webpack CSS loaders and native
# modules fail on Alpine's musl-libc with opaque errors.
# https://github.com/nodejs/docker-node/tree/main#nodealpine
RUN apk add --no-cache libc6-compat

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

# ── deps: install node_modules ────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copy only the manifests so Docker cache is invalidated only on lockfile changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/design-system/package.json packages/design-system/package.json
COPY packages/report/package.json packages/report/package.json
COPY packages/schema/package.json packages/schema/package.json

RUN pnpm install --frozen-lockfile

# ── build: compile the Next.js app ───────────────────────────────────────────
FROM base AS build
WORKDIR /app

# Bring installed node_modules + manifests from deps stage, then overlay source.
# Workspace-package symlinks (e.g. node_modules/@navigator/design-system →
# ../../packages/design-system) resolve once COPY . . adds the source files.
COPY --from=deps /app ./
COPY . .

# Give webpack enough heap for the full production build.
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Smoke-test the PostCSS/Tailwind pipeline before running the full webpack build.
# This surfaces the real error message if config loading fails, since the Next.js
# webpack error reporter truncates output and only shows the module identifier.
RUN node -e "
const path = require('path');
const postcss = require('/app/node_modules/postcss');
const tailwindcss = require('/app/node_modules/tailwindcss');
const autoprefixer = require('/app/node_modules/autoprefixer');
const fs = require('fs');
const css = fs.readFileSync('/app/apps/web/app/globals.css', 'utf8');
postcss([tailwindcss({ config: '/app/apps/web/tailwind.config.cjs' }), autoprefixer()])
  .process(css, { from: '/app/apps/web/app/globals.css' })
  .then(r => { console.log('PostCSS OK — output', r.css.length, 'bytes'); })
  .catch(e => { console.error('PostCSS FAILED:', e.message); process.exit(1); });
"

RUN pnpm --filter @navigator/web build

# ── runner: minimal production image ─────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /app ./

EXPOSE 3000

CMD ["pnpm", "--filter", "@navigator/web", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]
