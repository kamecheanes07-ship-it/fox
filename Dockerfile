# Fox Search — image compatible with Hugging Face Spaces (Docker SDK) and any
# self-hosted Docker host.
#
# Hugging Face Spaces specifics handled here:
#   * listens on 0.0.0.0:7860 (Space `app_port`)
#   * runs as UID/GID 1000 (the Space runtime user) — nothing needs root
#   * builds without package-lock.json if the Space upload missed it
#   * keeps runtime data in /data (persistent storage) when it exists,
#     otherwise /app/data, otherwise /tmp — see src/lib/data-dir.ts
#   * a `public/` folder is kept in the repo (with .gitkeep) so COPY never fails

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat wget
WORKDIR /app

# ---------------------------------------------------------------- dependencies
FROM base AS deps
# `package-lock.json*` matches zero or one file, so this works either way.
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then \
      npm ci --no-audit --no-fund; \
    else \
      npm install --no-audit --no-fund; \
    fi

# --------------------------------------------------------------------- builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production
RUN npm run build

# ---------------------------------------------------------------------- runner
FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=7860 \
    HOSTNAME=0.0.0.0

# HF Spaces runs containers as UID 1000. Pre-create every writable path
# (/app/data, and /data in case persistent storage is not mounted) so the app
# never crashes on a read-only or root-owned directory.
RUN mkdir -p /app/data /data \
 && chown -R 1000:1000 /app /data

COPY --from=deps --chown=1000:1000 /app/node_modules ./node_modules
COPY --from=builder --chown=1000:1000 /app/.next ./.next
COPY --from=builder --chown=1000:1000 /app/package.json ./package.json
COPY --from=builder --chown=1000:1000 /app/next.config.ts ./next.config.ts
COPY --from=builder --chown=1000:1000 /app/public ./public

USER 1000

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-7860}/api/health" >/dev/null || exit 1

CMD ["sh", "-c", "exec npx next start -H 0.0.0.0 -p ${PORT:-7860}"]
