import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const QueryBillsSchema = z.object({
  numero_cliente: z.string().optional(),
  mes_referencia: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type QueryBillsDtoType = z.infer<typeof QueryBillsSchema>;

export class QueryBillsDto extends createZodDto(QueryBillsSchema) {}

export const DashboardQuerySchema = z.object({
  numero_cliente: z.string().optional(),
  mes_referencia: z.string().optional(),
});

export class DashboardQueryDto extends createZodDto(DashboardQuerySchema) {}
