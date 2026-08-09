# Katepramax

Monorepo pnpm con dos aplicaciones:

- `apps/api` — Backend Fastify + Prisma (MySQL)
- `apps/web` — Frontend Vite + React

## Ejecutar en local (sin Docker)

```bash
pnpm install-all
pnpm dev:api   # API en http://localhost:8000
pnpm dev:web   # Web en http://localhost:5173
```

## Ejecutar con Docker

Levanta MySQL, el API y la Web en modo desarrollo (hot-reload / HMR):

```bash
docker compose up -d --build
```

- Web: http://localhost:5173
- API: http://localhost:8000 (swagger en http://localhost:8000/docs)
- MySQL: localhost:3306 (usuario `katepramax`, clave `katepramax`, BD `katepramax`)

Al primer arranque el API aplica las migraciones de Prisma y siembra la base de
datos (crea el usuario `admin` con clave `Admin1234.`). Para desactivar el seed
automático en los siguientes arranques:

```bash
SEED_ON_START=false docker compose up -d
```

Ver logs de un servicio:

```bash
docker compose logs -f api
```

Apagar:

```bash
docker compose down          # conserva los datos de MySQL
docker compose down -v       # borra también los volúmenes (resetea la BD)
```

### Variables de entorno (opcionales)

Se pueden sobrescribir copiando `.env` en la raíz (o exportándolas):

| Variable             | Default                                    |
| -------------------- | ------------------------------------------ |
| `MYSQL_DATABASE`     | `katepramax`                               |
| `MYSQL_USER`         | `katepramax`                               |
| `MYSQL_PASSWORD`     | `katepramax`                               |
| `MYSQL_ROOT_PASSWORD`| `katepramax_root`                          |
| `MYSQL_PORT`         | `3306`                                     |
| `JWT_SECRET`         | `clave-super-secreta-de-desarrollo-16chars`|
| `CORS_ORIGIN`        | `http://localhost:5173`                    |
| `ACCESS_TOKEN_TTL`   | `1h`                                       |
| `VITE_API_URL`       | `http://localhost:8000/api/v1`             |
| `SEED_ON_START`      | `true`                                     |

### Imágenes de producción

Ambos Dockerfiles tienen un target `prod` (el API ejecuta `node src/server.js`
y la Web es un build estático servido por nginx). Para usarlo, cambia
`target: dev` por `target: prod` en `docker-compose.yml` o construye directo:

```bash
docker build --target prod -t katepramax-api -f apps/api/Dockerfile .
docker build --target prod -t katepramax-web -f apps/web/Dockerfile .
```
