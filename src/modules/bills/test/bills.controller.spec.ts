import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BillsController } from '../controllers/bills.controller';
import { BillsService } from '../services/bills.service';
import { DashboardService } from '../../dashboard/services/dashboard.service';

describe('BillsController', () => {
  let controller: BillsController;
  let billsService: jest.Mocked<BillsService>;
  let dashboardService: jest.Mocked<DashboardService>;

  beforeEach(async () => {
    const mockBillsService = {
      processPdf: jest.fn(),
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    };

    const mockDashboardService = {
      getDashboard: jest.fn().mockResolvedValue({
        resumo: { totalFaturas: 0, totalClientes: 0 },
        energia: { consumoTotalKwh: 0, energiaCompensadaKwh: 0, consumoMedioKwh: 0, percentualCompensado: 0 },
        financeiro: { valorTotalSemGd: 0, economiaGd: 0, valorMedioFatura: 0, percentualEconomia: 0 },
        seriesPeriodo: [],
        porCliente: [],
        clientes: [],
        periodosDisponiveis: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillsController],
      providers: [
        { provide: BillsService, useValue: mockBillsService },
        { provide: DashboardService, useValue: mockDashboardService },
      ],
    }).compile();

    controller = module.get<BillsController>(BillsController);
    billsService = module.get(BillsService);
    dashboardService = module.get(DashboardService);
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
    it('should call findAll and return bills', async () => {
      const bills = [{ id: 1, numeroCliente: '7202210726' }];
      billsService.findAll.mockResolvedValue(bills as any);

      const result = await controller.list({
        numero_cliente: '7202210726',
        mes_referencia: 'SET/2024',
      } as any);

      expect(billsService.findAll).toHaveBeenCalledWith({
        numero_cliente: '7202210726',
        mes_referencia: 'SET/2024',
      });
      expect(result).toEqual(bills);
    });
  });

  describe('dashboard', () => {
    it('should call getDashboard and return dashboard data', async () => {
      const dashboardData = {
        resumo: { totalFaturas: 2, totalClientes: 1 },
        energia: { consumoTotalKwh: 526, energiaCompensadaKwh: 100, consumoMedioKwh: 263, percentualCompensado: 19 },
        financeiro: { valorTotalSemGd: 273.5, economiaGd: 50, valorMedioFatura: 136.75, percentualEconomia: 15.46 },
        seriesPeriodo: [],
        porCliente: [],
        clientes: ['7202210726'],
        periodosDisponiveis: [],
      };
      dashboardService.getDashboard.mockResolvedValue(dashboardData);

      const result = await controller.dashboard({
        numero_cliente: '7202210726',
      } as any);

      expect(dashboardService.getDashboard).toHaveBeenCalledWith({
        numero_cliente: '7202210726',
        mes_referencia: undefined,
      });
      expect(result).toEqual(dashboardData);
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

    it('should throw BadRequestException when bill not found', async () => {
      billsService.findOne.mockResolvedValue(null);

      await expect(controller.findOne({ id: 999 } as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
