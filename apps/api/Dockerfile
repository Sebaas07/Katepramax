# =============================================================================
# Dockerfile del API (Fastify + Prisma)
# Targets: dev (hot-reload) y prod (ejecución en modo producción)
# =============================================================================

# ---- Base: dependencias del monorepo pnpm ----
FROM node:22-bookworm-slim AS deps

RUN corepack enable \
  && apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Placeholder para que Prisma pueda validar/generar el cliente sin BD
ENV DATABASE_URL="mysql://user:pass@localhost:3306/db"

# Solo los archivos de manifiesto para aprovechar la caché de capas
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json

# Instala únicamente las dependencias del paquete api (y sus dependencias de workspace)
RUN pnpm install --frozen-lockfile --filter api...

# Código fuente completo (el resto queda excluido por .dockerignore)
COPY . .

# ---- Dev: hot-reload con node --watch ----
FROM deps AS dev

WORKDIR /app/apps/api

EXPOSE 3000

# El entrypoint aplica migraciones y (opcionalmente) el seed antes de arrancar
CMD ["sh", "./docker-entrypoint.sh", "pnpm", "dev"]

# ---- Build: genera el cliente de Prisma ----
FROM deps AS build

WORKDIR /app/apps/api

RUN pnpm db:generate && pnpm db:validate

# ---- Prod: imagen final mínima ----
FROM node:22-bookworm-slim AS prod

ENV NODE_ENV=production

RUN corepack enable \
  && apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json

RUN pnpm install --frozen-lockfile --filter api...

COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/src ./apps/api/src
COPY --from=build /app/apps/api/docker-entrypoint.sh ./apps/api/docker-entrypoint.sh

WORKDIR /app/apps/api

RUN pnpm db:generate

EXPOSE 3000

CMD ["sh", "./docker-entrypoint.sh", "pnpm", "start"]
