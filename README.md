# Lumi Energy Bill API

[![CI](https://github.com/victor-dias-dev/lumi-energy-bill-api/actions/workflows/ci.yml/badge.svg)](https://github.com/victor-dias-dev/lumi-energy-bill-api/actions/workflows/ci.yml)

HTTP API that reads a Brazilian electricity bill PDF, asks Gemini for a fixed JSON shape, and stores consumption, compensated energy, and the bill value without distributed generation.

The checked-in sample scores **100.0%** field accuracy (`9/9` fields, 1 synthetic bill) via `pnpm eval`. That number compares `fixtures/cassettes` with `fixtures/golden`. It is not a production benchmark. Refresh it against a live model with `EVAL_LIVE=1 pnpm eval`.

## Stack

- TypeScript, NestJS
- Sequelize, SQLite locally, PostgreSQL in production
- Google Gemini, Zod
- Swagger at `/api` when enabled

## Quick start

Requirements: Node.js 20+, pnpm, a [Gemini API key](https://aistudio.google.com/apikey).

```bash
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm start:dev
```

Swagger: `http://localhost:3000/api`

```bash
pnpm test
pnpm test:e2e
pnpm eval
pnpm build
```

Docker Compose runs Postgres 16 and the API. The container migrates on startup.

```bash
docker compose up --build
```

## Environment

| Variable | Role |
| --- | --- |
| `GEMINI_API_KEY` | Required for upload |
| `GEMINI_MODEL` | Preferred model. On HTTP 503 the service tries the next model in the list |
| `GEMINI_LAYOUT` | Layout id. Only `default` is registered |
| `DATABASE_PATH` | SQLite file when `DATABASE_URL` is not a Postgres URL. Default `./data/energy_bills.sqlite` |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` |
| `DATABASE_SSL` | Set to `false` for a database you run yourself. On a `*.render.com` host the client uses TLS and does not verify the certificate |
| `CORS_ORIGIN` | Comma-separated origins. Default `http://localhost:3000` |
| `API_KEY` | When set, `POST /bills/upload` requires header `x-api-key` |
| `SWAGGER_ENABLED` | `true` or `false`. Off in production unless set to `true` |
| `UPLOAD_RATE_LIMIT` | Uploads per window. Default `10` |
| `UPLOAD_RATE_TTL_MS` | Window length. Default `60000` |
| `PORT` | Default `3000` |

Schema comes from `migrations/`. The app does not use `synchronize`.

A public demo should set `API_KEY`. Without it, anyone who can reach the process can spend the Gemini quota.

## API

Responses use snake_case.

### `POST /bills/upload`

PDF only, 10 MB maximum. `400` for a missing file, a non-PDF, or a file over the limit. `401` when `API_KEY` is set and the header does not match. `409` when the same client and reference month were already stored (also enforced by a unique index). `422` when the model response does not match the schema. `429` after the upload rate limit. `503` when Gemini is unavailable.

```bash
curl -X POST http://localhost:3000/bills/upload \
  -H "x-api-key: $API_KEY" \
  -F "file=@fixtures/golden/sample-bill.pdf"
```

```json
{
  "id": 1,
  "numero_cliente": "1000000001",
  "mes_referencia": "SET/2024",
  "energia_eletrica_kwh": 50,
  "energia_eletrica_valor": 25.5,
  "energia_sceee_kwh": 476,
  "energia_sceee_valor": 238,
  "energia_compensada_kwh": 100,
  "energia_compensada_valor": 50,
  "contrib_ilum_publica": 10,
  "consumo_total_kwh": 526,
  "valor_total_sem_gd": 273.5,
  "economia_gd": 50
}
```

Calculated fields:

- `consumo_total_kwh` = electrical energy kWh + SCEEE kWh
- `valor_total_sem_gd` = electrical energy BRL + SCEEE BRL + public lighting
- `economia_gd` = compensated energy BRL

### `GET /bills`

Paginated. `page` defaults to 1. `limit` defaults to 20 and cannot exceed 100.

```bash
curl "http://localhost:3000/bills?numero_cliente=1000000001&page=1&limit=20"
```

```json
{ "data": [], "page": 1, "limit": 20, "total": 0 }
```

### `GET /bills/:id`

`404` when the id does not exist.

### `GET /bills/dashboard`

Totals, a series by `mes_referencia`, and a ranking by client. Filters: `numero_cliente`, `mes_referencia`. Aggregates run in SQL (`SUM`, `COUNT`, `GROUP BY`).

### `GET /health`

`{ "status": "ok" }` when the process can reach the database. `503` when it cannot.

## Layouts

`src/gemini/layouts/` registers extraction layouts. `default` is the GD bill shape above. Add another distributor by implementing `BillLayout` and shipping an anonymized golden file plus a cassette. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Deploy on Render

`render.yaml` creates Postgres and the web service in Oregon. Build: `pnpm install --frozen-lockfile && pnpm run build`. Start: `pnpm run db:migrate && pnpm run start:prod`.

Set `GEMINI_API_KEY` and `API_KEY` as secrets. `DATABASE_URL` comes from the blueprint database. Leave `DATABASE_SSL` unset on Render so the TLS option for `*.render.com` stays on.

## Project layout

```
src/
  gemini/          layouts, Gemini client, eval scorer
  modules/bills/   upload, list, repository
  modules/dashboard/
  health/
migrations/        energy_bills, unique (numero_cliente, mes_referencia)
fixtures/golden/   expected extraction and synthetic PDF
fixtures/cassettes recorded model output used by pnpm eval
```

## License

[MIT](LICENSE). This repository is an application, so `package.json` stays `private` and is not published to npm.

## Português

API que recebe o PDF de uma fatura de energia, extrai um JSON fixo com o Gemini e grava consumo, energia compensada e valor sem geração distribuída.

O sample versionado marca **100,0%** de acerto por campo (`9/9`, 1 fatura sintética) em `pnpm eval`. Esse número compara o cassette com o golden. Não é benchmark de produção. Para medir o modelo ao vivo: `EVAL_LIVE=1 pnpm eval`.

```bash
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm start:dev
```

O schema vem só das migrations (`synchronize` fica desligado). Sem `DATABASE_URL` em Postgres, o banco é SQLite em `DATABASE_PATH`.

| Variável | Função |
| --- | --- |
| `GEMINI_API_KEY` | Obrigatória no upload |
| `API_KEY` | Se existir, o upload exige o header `x-api-key` |
| `CORS_ORIGIN` | Origens separadas por vírgula. Padrão `http://localhost:3000` |
| `SWAGGER_ENABLED` | Em produção o Swagger nasce desligado |
| `DATABASE_SSL` | `false` no Postgres local. No host `*.render.com` o TLS não verifica o certificado |

Endpoints: `POST /bills/upload` (PDF, até 10 MB), `GET /bills` (página `data`, `page`, `limit`, `total`), `GET /bills/:id` (`404` se não existir), `GET /bills/dashboard`, `GET /health`. Duplicata de cliente + mês responde `409`. Extração inválida responde `422`. Gemini indisponível responde `503`.

O formato dos corpos está na seção em inglês acima. Contribuição, layout novo e fixtures: [CONTRIBUTING.md](CONTRIBUTING.md).
