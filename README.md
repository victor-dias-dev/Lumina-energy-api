# Lumi Energy Bill API

API RESTful para processamento de faturas de energia elétrica em PDF, utilizando Google Gemini para extração de dados via análise multimodal.

## Tecnologias

- **TypeScript** - Linguagem
- **NestJS** - Framework Node.js
- **Sequelize** - ORM
- **SQLite** - Banco de dados relacional
- **Google Gemini** - LLM multimodal para análise de PDFs
- **Zod** - Validação de schemas e DTOs
- **Swagger** - Documentação interativa da API

## Pré-requisitos

- Node.js 20+
- Chave de API do Google Gemini ([Google AI Studio](https://aistudio.google.com/apikey))

## Setup

```bash
# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite .env e defina GEMINI_API_KEY

# Rodar migrations do banco
pnpm db:migrate
```

## Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `GEMINI_API_KEY` | Chave da API Google Gemini (obrigatória para upload) |
| `GEMINI_MODEL` | Modelo preferido (opcional; fallback automático em 503) |
| `DATABASE_PATH` | Caminho do SQLite (default: `./data/energy_bills.sqlite`) — usado quando `DATABASE_URL` não está definida |
| `DATABASE_URL` | URL PostgreSQL (ex: `postgresql://user:pass@host:5432/db`) — quando definida, usa PostgreSQL em vez de SQLite |
| `NODE_ENV` | Ambiente (development/production) |
| `PORT` | Porta do servidor (default: 3000) |

## Execução

```bash
# Desenvolvimento
pnpm start:dev

# Produção
pnpm build
pnpm start:prod
```

## Swagger (Documentação Interativa)

Em produção ou desenvolvimento, a API expõe Swagger UI para testar os endpoints:

**URL:** `http://localhost:3000/api` (ou `https://seu-dominio.com/api` em produção)

No Swagger você pode:
- Visualizar todos os endpoints e schemas
- Testar requisições diretamente no navegador
- Enviar upload de PDF e ver respostas em tempo real

## Endpoints

### 1. Upload / Processamento

Envia um PDF de fatura de energia para extração via LLM e persistência no banco.

```bash
curl -X POST http://localhost:3000/bills/upload \
  -F "file=@/caminho/para/fatura.pdf"
```

**Response 201 (snake_case):**
```json
{
  "id": 1,
  "numero_cliente": "7202210726",
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
  "economia_gd": 50,
  "created_at": "2024-02-24T...",
  "updated_at": "2024-02-24T..."
}
```

### 2. Listagem (Biblioteca de Faturas)

Lista faturas processadas com filtros opcionais.

```bash
# Todas as faturas
curl http://localhost:3000/bills

# Com filtros
curl "http://localhost:3000/bills?numero_cliente=7202210726&mes_referencia=SET/2024"
```

**Response 200:** Array de faturas em snake_case (mesmo formato do upload).

### 3. Dashboard

Retorna dados consolidados para dashboards ricos, com métricas, séries temporais e agregações por cliente.

```bash
# Totais gerais
curl http://localhost:3000/bills/dashboard

# Com filtros
curl "http://localhost:3000/bills/dashboard?numero_cliente=7202210726&mes_referencia=SET/2024"
```

**Response 200:** Objeto completo em snake_case:

```json
{
  "resumo": {
    "total_faturas": 10,
    "total_clientes": 3
  },
  "energia": {
    "consumo_total_kwh": 5000,
    "energia_compensada_kwh": 1200,
    "consumo_medio_kwh": 500,
    "percentual_compensado": 24
  },
  "financeiro": {
    "valor_total_sem_gd": 2500,
    "economia_gd": 600,
    "valor_medio_fatura": 250,
    "percentual_economia": 19.35
  },
  "series_periodo": [
    {
      "mes_referencia": "SET/2024",
      "ano_referencia": 2024,
      "consumo_total_kwh": 1500,
      "valor_total_sem_gd": 800,
      "economia_gd": 200,
      "qtd_faturas": 3
    }
  ],
  "por_cliente": [
    {
      "numero_cliente": "7202210726",
      "qtd_faturas": 5,
      "consumo_total_kwh": 2500,
      "valor_total_sem_gd": 1200,
      "economia_gd": 300
    }
  ],
  "clientes": ["7202210726", "7202210727"],
  "periodos_disponiveis": [
    { "mes_referencia": "SET/2024", "ano_referencia": 2024 }
  ]
}
```

| Campo | Descrição |
|-------|-----------|
| `resumo` | Total de faturas e clientes |
| `energia` | Totais, médias e percentual compensado |
| `financeiro` | Valores e percentual de economia |
| `series_periodo` | Série temporal para gráficos (mês/ano) |
| `por_cliente` | Ranking por cliente (consumo total) |
| `clientes` | Lista de clientes únicos |
| `periodos_disponiveis` | Períodos para dropdowns |

### 4. Detalhe de Fatura

```bash
curl http://localhost:3000/bills/1
```

**Response 200:** Objeto da fatura em snake_case.

## Tratamento de Erros

| Código | Cenário |
|--------|---------|
| 400 | Arquivo inválido, não-PDF ou fatura não encontrada |
| 409 | Fatura já processada (cliente + mês duplicado) |
| 422 | Não foi possível extrair dados do PDF |
| 503 | Falha ao processar fatura com IA (Gemini indisponível) |

## Testes

```bash
# Unitários
pnpm test

# Com cobertura
pnpm run test:cov
```

## Migrations

```bash
# Aplicar migrations
pnpm db:migrate

# Resetar banco (desfaz todas)
pnpm db:migrate:undo:all
```

## Deploy em Produção

1. **Build:**
   ```bash
   pnpm build
   ```

2. **Variáveis de ambiente:** Configure `GEMINI_API_KEY`, `DATABASE_PATH` e `PORT` no servidor.

3. **Migrations:** Execute `pnpm db:migrate` antes de subir a aplicação.

4. **Swagger:** Disponível em `/api` — permite testar a API diretamente em produção.

5. **Processo:** Use `pm2`, `systemd` ou seu serviço preferido:

   ```bash
   node dist/main.js
   ```

### Deploy no Render (recomendado: PostgreSQL)

O SQLite exige bindings nativos que falham no Render. **Use PostgreSQL** (gratuito no Render):

1. **Crie um banco PostgreSQL** no Render (Dashboard → New → PostgreSQL).

2. **Copie a Internal Database URL** (ou External, se a API estiver em outro serviço).

3. **Configure no Web Service:**

| Campo | Valor |
|-------|-------|
| **Build Command** | `pnpm install && pnpm run build` |
| **Start Command** | `pnpm run start:prod` |

4. **Variáveis de ambiente:**

| Variável | Valor |
|----------|-------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/dbname` (URL do Render) |
| `GEMINI_API_KEY` | Sua chave da API Gemini |

Quando `DATABASE_URL` começa com `postgres://` ou `postgresql://`, a API usa PostgreSQL automaticamente (sem sqlite3). O Sequelize criará as tabelas com `synchronize: true` no primeiro deploy.

**Opção: Blueprint (render.yaml)**  
O projeto inclui `render.yaml` para deploy via Blueprint. Isso cria banco e API na mesma região (Oregon), garantindo que a Internal URL funcione. No Dashboard: Blueprints → New Blueprint Instance → selecione o repositório.

**Se Connection Refused persistir:**
1. **Região:** Web Service e PostgreSQL devem estar na **mesma região** (ex: Oregon). Verifique em Settings → Region.
2. **DATABASE_URL:** Use "Add from Database" no Web Service para injetar a URL correta (evita typo).
3. **External URL:** Se Internal falhar, teste com a External Database URL — funciona de qualquer região.
4. **Aguarde:** A API tenta conectar por até 60s no startup; banco Free pode demorar para acordar.

## Decisões Arquiteturais

- **NestJS**: Estrutura modular, injeção de dependência e boa testabilidade.
- **Sequelize**: ORM obrigatório no teste; SQLite para desenvolvimento sem dependências externas.
- **Gemini**: Suporte nativo a PDF multimodal e JSON estruturado via `responseSchema`.
- **Módulos separados**: `bills`, `dashboard`, `gemini` para responsabilidade única (SOLID).
- **snake_case nas respostas**: Todas as respostas da API usam snake_case para consistência e integração com frontends.
- **Logger**: NestJS Logger em todas as camadas para debug e monitoramento.
- **Swagger**: Documentação interativa para facilitar testes em produção.

## Estrutura do Projeto

```
src/
├── main.ts
├── app.module.ts
├── common/
│   ├── interceptors/     # SnakeCaseInterceptor
│   └── utils/            # snake-case.util
├── gemini/               # Integração com Google Gemini
├── modules/
│   ├── bills/           # Upload, listagem, entidade, repositório
│   └── dashboard/       # Agregações e métricas
├── config/
└── migrations/          # Sequelize migrations
```

## Variáveis Calculadas

Após extração do LLM, são calculadas:

- **Consumo de Energia Elétrica (kWh)**: Energia Elétrica kWh + Energia SCEEE kWh
- **Energia Compensada (kWh)**: Energia Compensada GD I kWh
- **Valor Total sem GD (R$)**: Energia Elétrica R$ + Energia SCEEE R$ + Contrib Ilum
- **Economia GD (R$)**: Energia Compensada GD I R$
