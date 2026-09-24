import { ZodType } from 'zod';
import { EnergyBillExtractionResult } from '../schemas/energy-bill.schema';

export interface BillLayout {
  id: string;
  prompt: string;
  jsonSchema: Record<string, unknown>;
  zodSchema: ZodType<EnergyBillExtractionResult>;
}
