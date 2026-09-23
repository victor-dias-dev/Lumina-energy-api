# Lumi Energy Bill API

[English](README.md)

[![CI](https://github.com/victor-dias-dev/lumi-energy-bill-api/actions/workflows/ci.yml/badge.svg)](https://github.com/victor-dias-dev/lumi-energy-bill-api/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

API HTTP que lê o PDF de uma fatura de energia brasileira, pede ao Gemini um JSON fixo e grava consumo, energia compensada e o valor da fatura sem geração distribuída.

O sample versionado marca 100,0% de acerto por campo (9/9 campos, 1 fatura sintética) em `pnpm eval`. Esse número compara `fixtures/cassettes` com `fixtures/golden`. Não é benchmark de produção. Para medir o modelo ao vivo: `EVAL_LIVE=1 pnpm eval`.

![API](docs/screenshots/api.png)
![Upload](docs/screenshots/upload.png)
![Dashboard](docs/screenshots/dashboard.png)

## O que a API cobre

- Upload de PDF, extração e persistência
- Listagem paginada e detalhe da fatura
- Totais do dashboard, série mensal e ranking por cliente
- Health check

As respostas usam snake_case. Cliente e mês de referência duplicados respondem `409`. Fatura inexistente responde `404`. Extração inválida responde `422`. Gemini indisponível responde `503`.

## Requisitos

- Node.js 20+
- pnpm
- Uma [chave da API Gemini](https://aistudio.google.com/apikey)

## Como subir

```bash
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm start:dev
```

Swagger em desenvolvimento: http://localhost:3000/api. Saúde: `GET /health`.

O schema vem das `migrations/`. A aplicação não usa `synchronize`. Sem `DATABASE_URL` de Postgres, o banco é SQLite em `DATABASE_PATH`.

O Docker Compose sobe Postgres 16 e a API. O container roda as migrations na subida.

```bash
docker compose up --build
```

Um demo público deve definir `API_KEY`. Sem ela, quem alcançar o processo gasta a cota do Gemini.

| Variável          | Função                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`  | Obrigatória no upload                                                                   |
| `GEMINI_MODEL`    | Modelo preferido. Em HTTP 503 o serviço tenta o próximo                                 |
| `GEMINI_LAYOUT`   | Id do layout. Só `default` está registrado                                              |
| `DATABASE_PATH`   | Arquivo SQLite quando `DATABASE_URL` não é Postgres. Padrão `./data/energy_bills.sqlite` |
| `DATABASE_URL`    | `postgresql://user:pass@host:5432/db`                                                   |
| `DATABASE_SSL`    | `false` no banco local. Em `*.render.com` o TLS não verifica o certificado              |
| `API_KEY`         | Se existir, `POST /bills/upload` exige o header `x-api-key`                             |
| `CORS_ORIGIN`     | Origens separadas por vírgula. Padrão `http://localhost:3000`                           |
| `SWAGGER_ENABLED` | `true` ou `false`. Em produção o Swagger nasce desligado                                |
| `PORT`            | Porta HTTP. Padrão `3000`                                                               |

O upload aceita só PDF, até 10 MB, com limite de taxa (`UPLOAD_RATE_LIMIT`, padrão 10 por `UPLOAD_RATE_TTL_MS`, padrão 60000).

## Verificação

```bash
pnpm test
pnpm test:e2e
pnpm eval
pnpm lint
pnpm build
```

## Repositório

```text
src/gemini            layouts, cliente Gemini, avaliador
src/modules/bills     upload, listagem, repositório
src/modules/dashboard
src/health
migrations            energy_bills
fixtures/golden       extração esperada e PDF sintético
fixtures/cassettes    resposta gravada do modelo, usada pelo pnpm eval
docs/screenshots
```

Campos calculados: `consumo_total_kwh` soma energia elétrica e SCEEE, `valor_total_sem_gd` inclui a iluminação pública, e `economia_gd` é o valor da energia compensada. Outro layout de distribuidora é um `BillLayout` em `src/gemini/layouts/`. Veja [CONTRIBUTING.md](CONTRIBUTING.md).

## Contribuição

Veja [CONTRIBUTING.md](CONTRIBUTING.md). Falha de segurança entra pelo [reporte privado](https://github.com/victor-dias-dev/lumi-energy-bill-api/security/advisories/new), descrito em [SECURITY.md](SECURITY.md).

Licença [MIT](LICENSE).
