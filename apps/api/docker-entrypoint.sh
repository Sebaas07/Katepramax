#!/bin/sh
# Entrypoint del contenedor del API.
# Aplica migraciones de Prisma, siembra la BD si se solicita y ejecuta el CMD.
set -e

echo "Generando cliente de Prisma..."
pnpm db:generate

echo "Aplicando migraciones..."
pnpm exec prisma migrate deploy

if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "Sembrando base de datos..."
  pnpm db:seed
fi

echo "Iniciando API..."
exec "$@"
