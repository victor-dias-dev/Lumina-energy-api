import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateBillSchema = z.object({
  numeroCliente: z.string(),
  mesReferencia: z.string(),
  energiaEletricaKwh: z.number(),
  energiaEletricaValor: z.number(),
  energiaSceeeKwh: z.number(),
  energiaSceeeValor: z.number(),
  energiaCompensadaKwh: z.number(),
  energiaCompensadaValor: z.number(),
  contribIlumPublica: z.number(),
  consumoTotalKwh: z.number(),
  valorTotalSemGd: z.number(),
  economiaGd: z.number(),
});

export type CreateBillDtoType = z.infer<typeof CreateBillSchema>;

export class CreateBillDto extends createZodDto(CreateBillSchema) {}
