# Agent Guidelines for Katepramax Monorepo

## Commands

- Install dependencies: `pnpm install` (or `pnpm install-all` from root)
- Development:
  - Start both API and Web: `pnpm dev`
  - Start only API: `pnpm dev:api`
  - Start only Web: `pnpm dev:web`
- Testing:
  - API tests: `pnpm --filter api test`
  - API tests with UI: `pnpm --filter api test:ui`
- Database (API):
  - Generate Prisma client: `pnpm --filter api db:generate`
  - Run migrations: `pnpm --filter api db:migrate`
  - Push schema: `pnpm --filter api db:push`
  - Seed database: `pnpm --filter api db:seed`
  - Open Prisma Studio: `pnpm --filter api db:studio`
  - Validate schema: `pnpm --filter api db:validate`
- Linting:
  - Web: `pnpm --filter web lint`
  - (API: no lint script defined)

## Project Structure

- Monorepo managed by pnpm
- `/apps`: Contains applications
  - `api`: Fastify + Prisma ORM backend
  - `web`: Vite + React frontend
- `/packages`: Currently empty, for shared packages
- Root `package.json` defines workspace and concurrent execution

## Important Files

- `.env` files: Environment variables (see `apps/api/.env.example` for API variables)
- Prisma schema: `apps/api/prisma/schema.prisma`
- API entry point: `apps/api/src/server.js`
- Web entry point: `apps/web/src/main.jsx` (implied by Vite React setup)
- API Vitest config: `apps/api/vitest.config.mjs`
- API Prisma config: `apps/api/prisma.config.ts`
- Web ESLint config: `apps/web/eslint.config.js` (implied by lint script)

## Notes

- The API uses Fastify and Prisma ORM.
- The web app uses Vite and React.
- Tests for API are using Vitest.
- No test script observed for web.
- Environment variables are required for API (PORT, DATABASE_URL, JWT_SECRET, CORS_ORIGIN, NODE_ENV, ACCESS_TOKEN_TTL).
- When working on the API, remember to generate Prisma client after schema changes: `pnpm --filter api db:generate`
- For database changes, use migrations: `pnpm --filter api db:migrate` (or push for development: `pnpm --filter api db:push`)