import { scoreExtraction } from './score-extraction';
import { EnergyBillExtractionResult } from '../schemas/energy-bill.schema';

const expected: EnergyBillExtractionResult = {
  'Nº DO CLIENTE': '1000000001',
  'Mês de referência': 'SET/2024',
  'Energia Elétrica': { kWh: 50, valor: 25.5 },
  'Energia SCEEE s/ICMS': { kWh: 476, valor: 238 },
  'Energia compensada GD I': { kWh: 100, valor: 50 },
  'Contrib Ilum Publica Municipal': { valor: 10 },
};

describe('scoreExtraction', () => {
  it('scores a perfect match as 100%', () => {
    const score = scoreExtraction(expected, expected);
    expect(score.matched).toBe(score.total);
    expect(score.accuracy).toBe(1);
  });

  it('counts a single mismatched field', () => {
    const actual: EnergyBillExtractionResult = {
      ...expected,
      'Energia Elétrica': { kWh: 49, valor: 25.5 },
    };
    const score = scoreExtraction(expected, actual);
    expect(score.matched).toBe(score.total - 1);
    expect(
      score.fields.find((field) => field.field === 'energia_eletrica_kwh')
        ?.match,
    ).toBe(false);
  });
});
