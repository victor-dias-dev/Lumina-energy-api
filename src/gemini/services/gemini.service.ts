import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenAI,
  createUserContent,
  createPartFromBase64,
} from '@google/genai';
import {
  EnergyBillExtractionResult,
  EnergyBillExtractionSchema,
  ENERGY_BILL_JSON_SCHEMA,
  EXTRACTION_PROMPT,
} from '../schemas/energy-bill.schema';

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

  async extractEnergyBillFromPdf(buffer: Buffer): Promise<EnergyBillExtractionResult> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY não configurada');
      throw new Error('GEMINI_API_KEY is required for PDF processing');
    }

    const base64Pdf = buffer.toString('base64');
    this.logger.debug(`PDF em base64: ${(base64Pdf.length / 1024).toFixed(1)} KB`);

    const contents = createUserContent([
      createPartFromBase64(base64Pdf, 'application/pdf'),
      EXTRACTION_PROMPT,
    ]);
    const config = {
      responseMimeType: 'application/json' as const,
      responseSchema: ENERGY_BILL_JSON_SCHEMA,
    };

    const customModel = this.configService.get<string>('GEMINI_MODEL');
    const modelsToTry = customModel ? [customModel, ...MODELS] : [...MODELS];
    this.logger.debug(`Modelos a tentar: ${modelsToTry.join(', ')}`);

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
          throw new Error('No response from LLM');
        }
        const parsed = JSON.parse(response.text);
        const result = EnergyBillExtractionSchema.parse(parsed);
        this.logger.log(`Extração concluída com sucesso: model=${model}`);
        return result;
      } catch (err) {
        lastError = err as Error;
        const errMsg = err instanceof Error ? err.message : String(err);
        if (is503(err)) {
          this.logger.warn(`Modelo ${model} retornou 503, tentando próximo...`);
          await new Promise((r) => setTimeout(r, 1500));
        } else {
          this.logger.error(`Erro no modelo ${model}: ${errMsg}`, err instanceof Error ? err.stack : undefined);
          throw err;
        }
      }
    }
    this.logger.error('Todos os modelos retornaram 503');
    throw lastError ?? new Error('Failed to process PDF with Gemini (all models returned 503)');
  }
}
