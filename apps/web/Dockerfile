# =============================================================================
# Dockerfile del Web (Vite + React)
# Targets: dev (servidor Vite con HMR) y prod (build estático servido por nginx)
# =============================================================================

# ---- Base: dependencias del monorepo pnpm ----
FROM node:22-bookworm-slim AS deps

RUN corepack enable

WORKDIR /app

# Solo los archivos de manifiesto para aprovechar la caché de capas
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

# Instala únicamente las dependencias del paquete web
RUN pnpm install --frozen-lockfile --filter web...

# Código fuente completo (el resto queda excluido por .dockerignore)
COPY . .

# ---- Dev: servidor Vite con HMR ----
FROM deps AS dev

WORKDIR /app/apps/web

EXPOSE 5173

CMD ["pnpm", "exec", "vite", "--host", "0.0.0.0", "--port", "5173"]

# ---- Build: genera los estáticos ----
FROM deps AS build

ARG VITE_API_URL=http://localhost:8000/api/v1
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app/apps/web

RUN pnpm build

# ---- Prod: nginx sirviendo el build ----
FROM nginx:alpine AS prod

COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY --from=build /app/apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
