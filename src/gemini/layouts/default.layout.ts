import {
  ENERGY_BILL_JSON_SCHEMA,
  EXTRACTION_PROMPT,
  EnergyBillExtractionSchema,
} from '../schemas/energy-bill.schema';
import { BillLayout } from './bill-layout';

export const defaultLayout: BillLayout = {
  id: 'default',
  prompt: EXTRACTION_PROMPT,
  jsonSchema: ENERGY_BILL_JSON_SCHEMA as unknown as Record<string, unknown>,
  zodSchema: EnergyBillExtractionSchema,
};
