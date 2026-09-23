import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { BillsService } from '../services/bills.service';
import { GeminiService } from '../../../gemini/services/gemini.service';
import { ENERGY_BILL_REPOSITORY } from '../interfaces/energy-bill-repository.interface';
import { EnergyBillExtractionResult } from '../../../gemini/schemas/energy-bill.schema';
import {
  ExtractionUnprocessableError,
  ModelUnavailableError,
} from '../../../gemini/errors/extraction.errors';

/**
 * 4.1.1 - Mock da resposta do LLM: não depende de chamadas externas de IA
 * nem consumo de tokens durante os testes.
 */
const mockExtraction: EnergyBillExtractionResult = {
  'Nº DO CLIENTE': '7202210726',
  'Mês de referência': 'SET/2024',
  'Energia Elétrica': { kWh: 50, valor: 25.5 },
  'Energia SCEEE s/ICMS': { kWh: 476, valor: 238.0 },
  'Energia compensada GD I': { kWh: 100, valor: 50.0 },
  'Contrib Ilum Publica Municipal': { valor: 10.0 },
};

describe('BillsService', () => {
  let service: BillsService;
  let geminiService: jest.Mocked<GeminiService>;
  let energyBillRepository: {
    create: jest.Mock;
    findByClienteAndMes: jest.Mock;
    findAll: jest.Mock;
    findById: jest.Mock;
  };

  beforeEach(async () => {
    energyBillRepository = {
      create: jest.fn().mockResolvedValue({
        id: 1,
        numeroCliente: '7202210726',
        mesReferencia: 'SET/2024',
        consumoTotalKwh: 526,
        valorTotalSemGd: 273.5,
        economiaGd: 50,
      }),
      findByClienteAndMes: jest.fn().mockResolvedValue(null),
      findAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(null),
    };

    const mockGeminiService = {
      extractEnergyBillFromPdf: jest.fn().mockResolvedValue(mockExtraction),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillsService,
        { provide: GeminiService, useValue: mockGeminiService },
        { provide: ENERGY_BILL_REPOSITORY, useValue: energyBillRepository },
      ],
    }).compile();

    service = module.get<BillsService>(BillsService);
    geminiService = module.get(GeminiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processPdf', () => {
    it('should extract data from PDF, calculate variables and save to DB', async () => {
      const buffer = Buffer.from('fake-pdf-content');
      const result = await service.processPdf(buffer);

      expect(geminiService.extractEnergyBillFromPdf).toHaveBeenCalledWith(
        buffer,
      );
      expect(energyBillRepository.findByClienteAndMes).toHaveBeenCalledWith(
        '7202210726',
        'SET/2024',
      );
      expect(energyBillRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          numeroCliente: '7202210726',
          mesReferencia: 'SET/2024',
          energiaEletricaKwh: 50,
          energiaSceeeKwh: 476,
          energiaCompensadaKwh: 100,
          consumoTotalKwh: 526,
          valorTotalSemGd: 273.5,
          economiaGd: 50,
        }),
      );
      expect(result).toBeDefined();
    });

    /**
     * 4.1.2 - Valida o cálculo correto das variáveis agregadas.
     */
    it('should calculate aggregated variables correctly from LLM mock', async () => {
      const buffer = Buffer.from('pdf');
      await service.processPdf(buffer);

      const createCall = energyBillRepository.create.mock.calls[0][0];

      expect(createCall.consumoTotalKwh).toBe(526);
      expect(createCall.consumoTotalKwh).toBe(
        createCall.energiaEletricaKwh + createCall.energiaSceeeKwh,
      );

      expect(createCall.valorTotalSemGd).toBe(273.5);
      expect(createCall.valorTotalSemGd).toBe(
        createCall.energiaEletricaValor +
          createCall.energiaSceeeValor +
          createCall.contribIlumPublica,
      );

      expect(createCall.economiaGd).toBe(50);
      expect(createCall.economiaGd).toBe(createCall.energiaCompensadaValor);

      expect(createCall.energiaCompensadaKwh).toBe(100);
    });

    it('should throw ConflictException when fatura already exists', async () => {
      energyBillRepository.findByClienteAndMes.mockResolvedValue({ id: 1 });

      await expect(service.processPdf(Buffer.from('pdf'))).rejects.toThrow(
        ConflictException,
      );
      expect(energyBillRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ServiceUnavailableException when LLM fails', async () => {
      geminiService.extractEnergyBillFromPdf.mockRejectedValue(
        new ModelUnavailableError('API error'),
      );

      await expect(service.processPdf(Buffer.from('pdf'))).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should throw UnprocessableEntityException when extraction is invalid', async () => {
      geminiService.extractEnergyBillFromPdf.mockRejectedValue(
        new ExtractionUnprocessableError(),
      );

      await expect(service.processPdf(Buffer.from('pdf'))).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('should throw ConflictException when the database unique index rejects the insert', async () => {
      const duplicate = new Error('duplicate');
      duplicate.name = 'SequelizeUniqueConstraintError';
      energyBillRepository.create.mockRejectedValue(duplicate);

      await expect(service.processPdf(Buffer.from('pdf'))).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return bills with optional filters', async () => {
      await service.findAll({ numero_cliente: '7202210726' });

      expect(energyBillRepository.findAll).toHaveBeenCalledWith({
        numero_cliente: '7202210726',
      });
    });
  });
});
