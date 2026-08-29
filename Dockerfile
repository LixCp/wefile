# syntax=docker/dockerfile:1

# ---------- base ----------
FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# ---------- all dependencies (needed for the build) ----------
FROM base AS deps
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# production dependencies only (tsx lives in "dependencies",
# so `pnpm start` works in the runtime image)
FROM base AS prod-deps
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# ---------- build ----------
FROM base AS builder
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ---------- run ----------
# Custom server (Next.js + Socket.IO signaling) runs via tsx,
# so files travel P2P over WebRTC while only SDP/ICE hits this container.
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server.ts ./server.ts
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/" >/dev/null 2>&1 || exit 1
CMD ["./node_modules/.bin/tsx", "server.ts"]