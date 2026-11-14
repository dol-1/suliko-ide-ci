# OPS-01 disposable offline-runtime container, stock upstream source only.
FROM node:22.19.0-bookworm@sha256:afff6d8c97964a438d2e6a9c96509367e45d8bf93f790ad561a1eaea926303d9
ENV CI=true BB_TELEMETRY=false
WORKDIR /workspace/stock-bb
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY . .
RUN pnpm install --frozen-lockfile && pnpm run build
USER node
