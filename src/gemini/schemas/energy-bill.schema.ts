import { z } from 'zod';

const EnergyBillRawItemSchema = z.object({
  kWh: z.coerce.number().catch(0),
  valor: z.coerce.number().catch(0),
});

const EnergyBillContribItemSchema = z.object({
  valor: z.coerce.number().catch(0),
});

export const EnergyBillExtractionSchema = z.object({
  'Nº DO CLIENTE': z.string(),
  'Mês de referência': z.string(),
  'Energia Elétrica': EnergyBillRawItemSchema,
  'Energia SCEEE s/ICMS': EnergyBillRawItemSchema,
  'Energia compensada GD I': EnergyBillRawItemSchema,
  'Contrib Ilum Publica Municipal': EnergyBillContribItemSchema,
});

export type EnergyBillExtractionResult = z.infer<
  typeof EnergyBillExtractionSchema
>;

export const ENERGY_BILL_JSON_SCHEMA = {
  type: 'object',
  properties: {
    'Nº DO CLIENTE': { type: 'string' },
    'Mês de referência': { type: 'string' },
    'Energia Elétrica': {
      type: 'object',
      properties: {
        kWh: { type: 'number' },
        valor: { type: 'number' },
      },
      required: ['kWh', 'valor'],
    },
    'Energia SCEEE s/ICMS': {
      type: 'object',
      properties: {
        kWh: { type: 'number' },
        valor: { type: 'number' },
      },
      required: ['kWh', 'valor'],
    },
    'Energia compensada GD I': {
      type: 'object',
      properties: {
        kWh: { type: 'number' },
        valor: { type: 'number' },
      },
      required: ['kWh', 'valor'],
    },
    'Contrib Ilum Publica Municipal': {
      type: 'object',
      properties: {
        valor: { type: 'number' },
      },
      required: ['valor'],
    },
  },
  required: [
    'Nº DO CLIENTE',
    'Mês de referência',
    'Energia Elétrica',
    'Energia SCEEE s/ICMS',
    'Energia compensada GD I',
    'Contrib Ilum Publica Municipal',
  ],
} as const;

export const EXTRACTION_PROMPT = `Analise este PDF de fatura de energia elétrica e extraia os dados exatamente no formato JSON especificado.

Extraia:
- Nº DO CLIENTE: número do cliente
- Mês de referência: mês e ano (ex: SET/2024)
- Energia Elétrica: kWh e valor em reais
- Energia SCEEE s/ICMS: kWh e valor em reais
- Energia compensada GD I: kWh e valor em reais
- Contrib Ilum Publica Municipal: valor em reais

Use 0 para valores não encontrados ou ausentes.`;
