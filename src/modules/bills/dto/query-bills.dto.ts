import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const QueryBillsSchema = z.object({
  numero_cliente: z.string().optional(),
  mes_referencia: z.string().optional(),
});

export type QueryBillsDtoType = z.infer<typeof QueryBillsSchema>;

export class QueryBillsDto extends createZodDto(QueryBillsSchema) {}
