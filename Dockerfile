# Fox Search — Hugging Face Spaces & Self-hosted Docker image
# NOTE: does NOT require package-lock.json (HF uploads often miss it).
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat wget
WORKDIR /app

FROM base AS deps
COPY package.json ./
RUN npm install --no-audit --no-fund

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=7860 \
    HOSTNAME=0.0.0.0 \
    FOX_DATA_DIR=/app/data

# Hugging Face Spaces runs containers with user ID 1000.
RUN mkdir -p /app/data && chown -R 1000:1000 /app
COPY --from=deps --chown=1000:1000 /app/node_modules ./node_modules
COPY --from=builder --chown=1000:1000 /app/public ./public
COPY --from=builder --chown=1000:1000 /app/.next ./.next
COPY --from=builder --chown=1000:1000 /app/package.json ./package.json
COPY --from=builder --chown=1000:1000 /app/next.config.ts ./next.config.ts

USER 1000
EXPOSE 7860
HEALTHCHECK --interval=30s --timeout=5s --retries=5 \
  CMD wget -qO- http://127.0.0.1:${PORT}/api/health || exit 1
CMD ["sh", "-c", "npx next start -H 0.0.0.0 -p ${PORT:-7860}"]
