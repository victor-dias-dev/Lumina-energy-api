import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ParamIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export class ParamIdDto extends createZodDto(ParamIdSchema) {}
