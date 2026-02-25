import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from '../services/dashboard.service';
import { ENERGY_BILL_REPOSITORY } from '../../bills/interfaces/energy-bill-repository.interface';

const mockDashboard = {
  resumo: { totalFaturas: 5, totalClientes: 2 },
  energia: {
    consumoTotalKwh: 500,
    energiaCompensadaKwh: 100,
    consumoMedioKwh: 100,
    percentualCompensado: 20,
  },
  financeiro: {
    valorTotalSemGd: 1000,
    economiaGd: 200,
    valorMedioFatura: 200,
    percentualEconomia: 16.67,
  },
  seriesPeriodo: [],
  porCliente: [],
  clientes: ['7202210726'],
  periodosDisponiveis: [],
};

describe('DashboardService', () => {
  let service: DashboardService;
  let energyBillRepository: { getDashboard: jest.Mock };

  beforeEach(async () => {
    energyBillRepository = {
      getDashboard: jest.fn().mockResolvedValue(mockDashboard),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: ENERGY_BILL_REPOSITORY, useValue: energyBillRepository },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return dashboard data', async () => {
    const result = await service.getDashboard({});

    expect(energyBillRepository.getDashboard).toHaveBeenCalledWith({});
    expect(result.resumo.totalFaturas).toBe(5);
    expect(result.energia.consumoTotalKwh).toBe(500);
    expect(result.financeiro.valorTotalSemGd).toBe(1000);
  });

  it('should apply filters when provided', async () => {
    await service.getDashboard({
      numero_cliente: '7202210726',
      mes_referencia: 'SET/2024',
    });

    expect(energyBillRepository.getDashboard).toHaveBeenCalledWith({
      numero_cliente: '7202210726',
      mes_referencia: 'SET/2024',
    });
  });
});
