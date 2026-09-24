# Lumi Energy Bill API

[Português](README.pt-BR.md)

[![CI](https://github.com/victor-dias-dev/lumi-energy-bill-api/actions/workflows/ci.yml/badge.svg)](https://github.com/victor-dias-dev/lumi-energy-bill-api/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

HTTP API that reads a Brazilian electricity bill PDF, asks Gemini for a fixed JSON shape, and stores consumption, compensated energy, and the bill value without distributed generation.

The checked-in sample scores 100.0% field accuracy (9/9 fields, 1 synthetic bill) via `pnpm eval`. That number compares `fixtures/cassettes` with `fixtures/golden`. It is not a production benchmark. Refresh it against a live model with `EVAL_LIVE=1 pnpm eval`.

![API](docs/screenshots/api.png)
![Upload](docs/screenshots/upload.png)
![Dashboard](docs/screenshots/dashboard.png)

## What the API covers

- PDF upload, extraction, and persistence
- Paginated list and bill detail
- Dashboard totals, a monthly series, and a ranking by client
- Health check

Responses use snake_case. A duplicate client and reference month returns `409`. A missing bill returns `404`. An invalid extraction returns `422`. Gemini unavailable returns `503`.

## Requirements

- Node.js 20+
- pnpm
- A [Gemini API key](https://aistudio.google.com/apikey)

## Quick start

```bash
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm start:dev
```

Swagger in development: http://localhost:3000/api. Health: `GET /health`.

Schema comes from `migrations/`. The app does not use `synchronize`. Without a Postgres `DATABASE_URL`, the database is SQLite at `DATABASE_PATH`.

Docker Compose runs Postgres 16 and the API. The container migrates on startup.

```bash
docker compose up --build
```

A public demo should set `API_KEY`. Without it, anyone who can reach the process can spend the Gemini quota.

| Variable           | Purpose                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`   | Required for upload                                                                     |
| `GEMINI_MODEL`     | Preferred model. On HTTP 503 the service tries the next model                          |
| `GEMINI_LAYOUT`    | Layout id. Only `default` is registered                                                 |
| `DATABASE_PATH`    | SQLite file when `DATABASE_URL` is not Postgres. Default `./data/energy_bills.sqlite`  |
| `DATABASE_URL`     | `postgresql://user:pass@host:5432/db`                                                   |
| `DATABASE_SSL`     | `false` for a database you run. On `*.render.com`, TLS does not verify the certificate |
| `API_KEY`          | When set, `POST /bills/upload` requires header `x-api-key`                              |
| `CORS_ORIGIN`      | Comma-separated origins. Default `http://localhost:3000`                                |
| `SWAGGER_ENABLED`  | `true` or `false`. Off in production unless set to `true`                              |
| `PORT`             | HTTP port. Default `3000`                                                               |

Uploads are PDF only, 10 MB maximum, and rate limited (`UPLOAD_RATE_LIMIT`, default 10 per `UPLOAD_RATE_TTL_MS`, default 60000).

## Checks

```bash
pnpm test
pnpm test:e2e
pnpm eval
pnpm lint
pnpm build
```

## Repository

```text
src/gemini            layouts, Gemini client, eval scorer
src/modules/bills     upload, list, repository
src/modules/dashboard
src/health
migrations            energy_bills
fixtures/golden       expected extraction and synthetic PDF
fixtures/cassettes    recorded model output used by pnpm eval
docs/screenshots
```

Calculated fields: `consumo_total_kwh` is electrical energy plus SCEEE, `valor_total_sem_gd` adds public lighting, and `economia_gd` is the compensated energy amount. Another distributor layout is a `BillLayout` under `src/gemini/layouts/`. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security reports go through [private vulnerability reporting](https://github.com/victor-dias-dev/lumi-energy-bill-api/security/advisories/new), described in [SECURITY.md](SECURITY.md).

Licensed under the [MIT License](LICENSE).
