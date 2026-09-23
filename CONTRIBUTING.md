# Contributing

Thanks for helping Lumi read Brazilian energy bills.

## Setup

```bash
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm start:dev
```

Node.js 20 or newer. The package manager is pnpm. `pnpm test`, `pnpm test:e2e`, `pnpm lint`, and `pnpm eval` should pass before you open a pull request.

`pnpm eval` scores the checked-in cassette against `fixtures/golden`. It does not call Gemini. To score a live model:

```bash
EVAL_LIVE=1 pnpm eval
EVAL_LIVE=1 EVAL_UPDATE_CASSETTE=1 pnpm eval
```

The second command rewrites `fixtures/cassettes`. Commit that file only when the new response is the sample you want the README number to track.

## Migrations

Schema changes go in `migrations/`. The app runs with `synchronize: false`. Generate SQL that matches `EnergyBill`, and keep the unique index on `(numero_cliente, mes_referencia)`.

## Adding a distributor layout

1. Add a file in `src/gemini/layouts/` that exports a `BillLayout`: an id, a prompt, a JSON schema, and a Zod schema with the same shape as `EnergyBillExtractionResult`.
2. Register it in `src/gemini/layouts/index.ts`.
3. Add a golden JSON, a synthetic or anonymized PDF, and a cassette under `fixtures/`.
4. Select it with `GEMINI_LAYOUT`.

The `default` layout is the only one checked in. A second real distributor, with an anonymized PDF and a cassette, is the most useful contribution. Do not commit a bill that still has a person's name, address, CPF, or a real client number.

Regenerate the sample PDF with `node scripts/generate-sample-pdf.js` if you change the synthetic text.

## Good first issues

- A new distributor layout plus fixture
- Another golden bill and its cassette
- A dashboard metric that the current SQL aggregates do not expose

## Português

O fluxo é o mesmo: `pnpm install`, copiar `.env.example`, `pnpm db:migrate`, testes e `pnpm eval`. Layout novo entra em `src/gemini/layouts/` e precisa de fixture anonimizada. Não envie fatura com dado pessoal.
