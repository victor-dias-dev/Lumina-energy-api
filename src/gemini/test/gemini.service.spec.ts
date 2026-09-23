import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GeminiService } from '../services/gemini.service';

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    files: {
      upload: jest.fn().mockResolvedValue({
        uri: 'https://generativelanguage.googleapis.com/v1beta/files/xxx',
        mimeType: 'application/pdf',
      }),
    },
    models: {
      generateContent: jest.fn().mockResolvedValue({
        text: JSON.stringify({
          'Nº DO CLIENTE': '7202210726',
          'Mês de referência': 'SET/2024',
          'Energia Elétrica': { kWh: 50, valor: 25.5 },
          'Energia SCEEE s/ICMS': { kWh: 476, valor: 238.0 },
          'Energia compensada GD I': { kWh: 100, valor: 50.0 },
          'Contrib Ilum Publica Municipal': { valor: 10.0 },
        }),
      }),
    },
  })),
  createUserContent: jest.fn((x) => x),
  createPartFromUri: jest.fn((uri, mime) => ({
    fileData: { fileUri: uri, mimeType: mime },
  })),
  createPartFromBase64: jest.fn((data, mime) => ({
    inlineData: { data, mimeType: mime },
  })),
}));

describe('GeminiService', () => {
  let service: GeminiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-api-key') },
        },
      ],
    }).compile();

    service = module.get<GeminiService>(GeminiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw when GEMINI_API_KEY is missing', async () => {
    const module2 = await Test.createTestingModule({
      providers: [
        GeminiService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(undefined) },
        },
      ],
    }).compile();

    const svc = module2.get<GeminiService>(GeminiService);
    await expect(
      svc.extractEnergyBillFromPdf(Buffer.from('pdf')),
    ).rejects.toThrow('GEMINI_API_KEY is required');
  });
});
