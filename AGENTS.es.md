# Directrices para Agentes en el Monorepo Katepramax

## Comandos

- Instalar dependencias: `pnpm install` (o `pnpm install-all` desde la raíz)
- Desarrollo:
  - Iniciar tanto API como Web: `pnpm dev`
  - Iniciar solo API: `pnpm dev:api`
  - Iniciar solo Web: `pnpm dev:web`
- Pruebas:
  - Pruebas de API: `pnpm --filter api test`
  - Pruebas de API con UI: `pnpm --filter api test:ui`
- Base de datos (API):
  - Generar cliente Prisma: `pnpm --filter api db:generate`
  - Ejecutar migraciones: `pnpm --filter api db:migrate`
  - Empujar esquema: `pnpm --filter api db:push`
  - Sembrar base de datos: `pnpm --filter api db:seed`
  - Abrir Prisma Studio: `pnpm --filter api db:studio`
  - Validar esquema: `pnpm --filter api db:validate`
- Linting:
  - Web: `pnpm --filter web lint`
  - (API: no hay script de lint definido)

## Estructura del Proyecto

- Monorepo gestionado por pnpm
- `/apps`: Contiene aplicaciones
  - `api`: Backend Fastify + ORM Prisma
  - `web`: Frontend Vite + React
- `/packages`: Actualmente vacío, para paquetes compartidos
- El `package.json` raíz define el workspace y ejecución concurrente

## Archivos Importantes

- Archivos `.env`: Variables de entorno (ver `apps/api/.env.example` para variables de API)
- Esquema Prisma: `apps/api/prisma/schema.prisma`
- Punto de entrada de la API: `apps/api/src/server.js`
- Punto de entrada de la web: `apps/web/src/main.jsx` (implícito por la configuración de Vite React)
- Configuración de Vitest de la API: `apps/api/vitest.config.mjs`
- Configuración de Prisma de la API: `apps/api/prisma.config.ts`
- Configuración de ESLint de la web: `apps/web/eslint.config.js` (implícita por el script de lint)

## Notas

- La API utiliza Fastify y Prisma ORM.
- La aplicación web utiliza Vite y React.
- Las pruebas de API utilizan Vitest.
- No se observa script de prueba para la web.
- Las variables de entorno son requeridas para la API (PORT, DATABASE_URL, JWT_SECRET, CORS_ORIGIN, NODE_ENV, ACCESS_TOKEN_TTL).
- Al trabajar en la API, recuerde generar el cliente Prisma después de cambios en el esquema: `pnpm --filter api db:generate`
- Para cambios en la base de datos, use migraciones: `pnpm --filter api db:migrate` (o push para desarrollo: `pnpm --filter api db:push`)