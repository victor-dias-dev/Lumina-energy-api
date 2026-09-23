import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenAI,
  createUserContent,
  createPartFromBase64,
} from '@google/genai';
import { ZodError } from 'zod';
import {
  ExtractionUnprocessableError,
  ModelUnavailableError,
} from '../errors/extraction.errors';
import { EnergyBillExtractionResult } from '../schemas/energy-bill.schema';
import { getLayout } from '../layouts';

const MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
] as const;

function is503(err: unknown): boolean {
  return (
    (err as { statusCode?: number }).statusCode === 503 ||
    (err as { status?: string }).status === 'UNAVAILABLE' ||
    String((err as Error).message).includes('503') ||
    String((err as Error).message).includes('Service Unavailable')
  );
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private ai: GoogleGenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    this.ai = new GoogleGenAI({ apiKey });
  }

  async extractEnergyBillFromPdf(
    buffer: Buffer,
  ): Promise<EnergyBillExtractionResult> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY não configurada');
      throw new ModelUnavailableError(
        'GEMINI_API_KEY is required for PDF processing',
      );
    }

    const layout = getLayout(
      this.configService.get<string>('GEMINI_LAYOUT') || 'default',
    );
    const base64Pdf = buffer.toString('base64');
    this.logger.debug(
      `PDF em base64: ${(base64Pdf.length / 1024).toFixed(1)} KB`,
    );

    const contents = createUserContent([
      createPartFromBase64(base64Pdf, 'application/pdf'),
      layout.prompt,
    ]);
    const config = {
      responseMimeType: 'application/json' as const,
      responseSchema: layout.jsonSchema,
    };

    const customModel = this.configService.get<string>('GEMINI_MODEL');
    const modelsToTry = customModel ? [customModel, ...MODELS] : [...MODELS];
    this.logger.debug(
      `Layout ${layout.id}. Modelos a tentar: ${modelsToTry.join(', ')}`,
    );

    let lastError: Error | null = null;
    for (const model of modelsToTry) {
      try {
        this.logger.log(`Chamando Gemini: model=${model}`);
        const response = await this.ai.models.generateContent({
          model,
          contents,
          config,
        });
        if (!response?.text) {
          throw new ExtractionUnprocessableError();
        }
        const parsed = JSON.parse(response.text) as unknown;
        const result = layout.zodSchema.parse(parsed);
        this.logger.log(`Extração concluída com sucesso: model=${model}`);
        return result;
      } catch (err) {
        if (
          err instanceof ExtractionUnprocessableError ||
          err instanceof ModelUnavailableError
        ) {
          throw err;
        }
        if (err instanceof ZodError || err instanceof SyntaxError) {
          this.logger.error(`Resposta inválida do modelo ${model}`);
          throw new ExtractionUnprocessableError();
        }
        lastError = err as Error;
        const errMsg = err instanceof Error ? err.message : String(err);
        if (is503(err)) {
          this.logger.warn(`Modelo ${model} retornou 503, tentando próximo...`);
          await new Promise((r) => setTimeout(r, 1500));
        } else {
          this.logger.error(
            `Erro no modelo ${model}: ${errMsg}`,
            err instanceof Error ? err.stack : undefined,
          );
          throw new ModelUnavailableError();
        }
      }
    }
    this.logger.error('Todos os modelos retornaram 503');
    throw new ModelUnavailableError(lastError?.message);
  }
}
