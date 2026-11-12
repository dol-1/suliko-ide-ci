# OPS-01 disposable offline-runtime container, stock upstream source only.
FROM node:22.19.0-bookworm
ENV CI=true BB_TELEMETRY=false
WORKDIR /workspace/stock-bb
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY . .
RUN pnpm install --frozen-lockfile && pnpm run build
USER node
