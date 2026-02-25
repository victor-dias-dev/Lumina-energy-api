# Lumi Energy Bill API

API RESTful para processamento de faturas de energia elétrica em PDF, utilizando Google Gemini para extração de dados via análise multimodal.

## Tecnologias

- **TypeScript** - Linguagem
- **NestJS** - Framework Node.js
- **Sequelize** - ORM
- **SQLite** - Banco de dados relacional
- **Google Gemini** - LLM multimodal para análise de PDFs

## Pré-requisitos

- Node.js 20+
- Chave de API do Google Gemini ([Google AI Studio](https://aistudio.google.com/apikey))

## Setup

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite .env e defina GEMINI_API_KEY
```

## Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `GEMINI_API_KEY` | Chave da API Google Gemini (obrigatória para upload) |
| `DATABASE_PATH` | Caminho do arquivo SQLite (default: `./data/energy_bills.sqlite`) |
| `NODE_ENV` | Ambiente (development/production) |
| `PORT` | Porta do servidor (default: 3000) |

## Execução

```bash
# Desenvolvimento
npm run start:dev

# Produção
npm run build
npm run start:prod
```

## Endpoints

### 1. Upload / Processamento

Envia um PDF de fatura de energia para extração via LLM e persistência no banco.

```bash
curl -X POST http://localhost:3000/bills/upload \
  -F "file=@/caminho/para/fatura.pdf"
```

**Response 201:**
```json
{
  "id": 1,
  "numeroCliente": "7202210726",
  "mesReferencia": "SET/2024",
  "energiaEletricaKwh": 50,
  "energiaEletricaValor": 25.5,
  "energiaSceeeKwh": 476,
  "energiaSceeeValor": 238,
  "energiaCompensadaKwh": 100,
  "energiaCompensadaValor": 50,
  "contribIlumPublica": 10,
  "consumoTotalKwh": 526,
  "valorTotalSemGd": 273.5,
  "economiaGd": 50,
  "createdAt": "2024-02-24T...",
  "updatedAt": "2024-02-24T..."
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

### 3. Dashboard

Retorna dados consolidados (agregados).

```bash
# Totais gerais
curl http://localhost:3000/bills/dashboard

# Com filtros
curl "http://localhost:3000/bills/dashboard?numero_cliente=7202210726&mes_referencia=SET/2024"
```

**Response:**
```json
{
  "energia": {
    "consumoTotalKwh": 526,
    "energiaCompensadaKwh": 100
  },
  "financeiro": {
    "valorTotalSemGd": 273.5,
    "economiaGd": 50
  }
}
```

### 4. Detalhe de Fatura

```bash
curl http://localhost:3000/bills/1
```

## Tratamento de Erros

| Código | Cenário |
|--------|---------|
| 400 | Arquivo inválido ou não-PDF |
| 409 | Fatura já processada (cliente + mês duplicado) |
| 422 | Não foi possível extrair dados do PDF |
| 502 | Falha ao processar fatura com IA |

## Testes

```bash
# Unitários
npm test

# Com cobertura
npm run test:cov
```

## Decisões Arquiteturais

- **NestJS**: Estrutura modular, injeção de dependência e boa testabilidade.
- **Sequelize**: ORM obrigatório no teste; SQLite para desenvolvimento sem dependências externas.
- **Gemini**: Suporte nativo a PDF multimodal e JSON estruturado via `responseSchema`.
- **Módulos separados**: `bills`, `dashboard`, `gemini` para responsabilidade única (SOLID).

## Estrutura do Projeto

```
src/
├── main.ts
├── app.module.ts
├── gemini/           # Integração com Google Gemini
├── modules/
│   ├── bills/        # Upload, listagem, entidade
│   └── dashboard/    # Agregações
```

## Variáveis Calculadas

Após extração do LLM, são calculadas:

- **Consumo de Energia Elétrica (kWh)**: Energia Elétrica kWh + Energia SCEEE kWh
- **Energia Compensada (kWh)**: Energia Compensada GD I kWh
- **Valor Total sem GD (R$)**: Energia Elétrica R$ + Energia SCEEE R$ + Contrib Ilum
- **Economia GD (R$)**: Energia Compensada GD I R$
