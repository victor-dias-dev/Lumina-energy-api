import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { BillsController } from '../controllers/bills.controller';
import { BillsService } from '../services/bills.service';
import { ApiKeyGuard } from '../../../common/guards/api-key.guard';

describe('BillsController', () => {
  let controller: BillsController;
  let billsService: jest.Mocked<BillsService>;

  beforeEach(async () => {
    const mockBillsService = {
      processPdf: jest.fn(),
      findAll: jest
        .fn()
        .mockResolvedValue({ data: [], page: 1, limit: 20, total: 0 }),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillsController],
      providers: [{ provide: BillsService, useValue: mockBillsService }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BillsController>(BillsController);
    billsService = module.get(BillsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('upload', () => {
    it('should throw BadRequestException when no file is provided', async () => {
      await expect(
        controller.upload(undefined as unknown as Express.Multer.File),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when file is not PDF', async () => {
      const file = {
        buffer: Buffer.from('test'),
        mimetype: 'image/png',
      } as Express.Multer.File;

      await expect(controller.upload(file)).rejects.toThrow(
        'Apenas arquivos PDF são aceitos',
      );
    });

    it('should call processPdf when valid PDF is provided', async () => {
      const file = {
        buffer: Buffer.from('pdf-content'),
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      billsService.processPdf.mockResolvedValue({ id: 1 } as any);

      const result = await controller.upload(file);
      expect(billsService.processPdf).toHaveBeenCalledWith(file.buffer);
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('list', () => {
    it('should call findAll and return a page', async () => {
      const page = {
        data: [{ id: 1, numeroCliente: '7202210726' }],
        page: 1,
        limit: 20,
        total: 1,
      };
      billsService.findAll.mockResolvedValue(page as any);

      const result = await controller.list({
        numero_cliente: '7202210726',
        mes_referencia: 'SET/2024',
        page: 1,
        limit: 20,
      } as any);

      expect(billsService.findAll).toHaveBeenCalledWith({
        numero_cliente: '7202210726',
        mes_referencia: 'SET/2024',
        page: 1,
        limit: 20,
      });
      expect(result).toEqual(page);
    });
  });

  describe('findOne', () => {
    it('should return bill when found', async () => {
      const bill = { id: 1, numeroCliente: '7202210726' };
      billsService.findOne.mockResolvedValue(bill as any);

      const result = await controller.findOne({ id: 1 } as any);

      expect(billsService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(bill);
    });

    it('should throw NotFoundException when bill not found', async () => {
      billsService.findOne.mockResolvedValue(null);

      await expect(controller.findOne({ id: 999 } as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
