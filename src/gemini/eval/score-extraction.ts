import { EnergyBillExtractionResult } from '../schemas/energy-bill.schema';

export interface FieldScore {
  field: string;
  expected: string | number;
  actual: string | number;
  match: boolean;
}

export interface ExtractionScore {
  total: number;
  matched: number;
  accuracy: number;
  fields: FieldScore[];
}

const READERS: Array<{
  field: string;
  read: (value: EnergyBillExtractionResult) => string | number;
}> = [
  { field: 'numero_cliente', read: (value) => value['Nº DO CLIENTE'] },
  { field: 'mes_referencia', read: (value) => value['Mês de referência'] },
  {
    field: 'energia_eletrica_kwh',
    read: (value) => value['Energia Elétrica'].kWh,
  },
  {
    field: 'energia_eletrica_valor',
    read: (value) => value['Energia Elétrica'].valor,
  },
  {
    field: 'energia_sceee_kwh',
    read: (value) => value['Energia SCEEE s/ICMS'].kWh,
  },
  {
    field: 'energia_sceee_valor',
    read: (value) => value['Energia SCEEE s/ICMS'].valor,
  },
  {
    field: 'energia_compensada_kwh',
    read: (value) => value['Energia compensada GD I'].kWh,
  },
  {
    field: 'energia_compensada_valor',
    read: (value) => value['Energia compensada GD I'].valor,
  },
  {
    field: 'contrib_ilum_publica',
    read: (value) => value['Contrib Ilum Publica Municipal'].valor,
  },
];

function valuesMatch(
  expected: string | number,
  actual: string | number,
): boolean {
  if (typeof expected === 'number' || typeof actual === 'number') {
    return Number(expected) === Number(actual);
  }
  return expected.trim() === actual.trim();
}

export function scoreExtraction(
  expected: EnergyBillExtractionResult,
  actual: EnergyBillExtractionResult,
): ExtractionScore {
  const fields = READERS.map(({ field, read }) => {
    const expectedValue = read(expected);
    const actualValue = read(actual);
    return {
      field,
      expected: expectedValue,
      actual: actualValue,
      match: valuesMatch(expectedValue, actualValue),
    };
  });
  const matched = fields.filter((field) => field.match).length;
  return {
    total: fields.length,
    matched,
    accuracy: fields.length === 0 ? 0 : matched / fields.length,
    fields,
  };
}
