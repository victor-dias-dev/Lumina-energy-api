import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from '../controllers/dashboard.controller';
import { DashboardService } from '../services/dashboard.service';

describe('DashboardController', () => {
  let controller: DashboardController;
  let dashboardService: jest.Mocked<DashboardService>;

  beforeEach(async () => {
    const mockDashboardService = {
      getDashboard: jest.fn().mockResolvedValue({
        resumo: { totalFaturas: 0, totalClientes: 0 },
        energia: {
          consumoTotalKwh: 0,
          energiaCompensadaKwh: 0,
          consumoMedioKwh: 0,
          percentualCompensado: 0,
        },
        financeiro: {
          valorTotalSemGd: 0,
          economiaGd: 0,
          valorMedioFatura: 0,
          percentualEconomia: 0,
        },
        seriesPeriodo: [],
        porCliente: [],
        clientes: [],
        periodosDisponiveis: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
      ],
    }).compile();

    controller = module.get(DashboardController);
    dashboardService = module.get(DashboardService);
  });

  it('should call getDashboard and return dashboard data', async () => {
    const dashboardData = {
      resumo: { totalFaturas: 2, totalClientes: 1 },
      energia: {
        consumoTotalKwh: 526,
        energiaCompensadaKwh: 100,
        consumoMedioKwh: 263,
        percentualCompensado: 19,
      },
      financeiro: {
        valorTotalSemGd: 273.5,
        economiaGd: 50,
        valorMedioFatura: 136.75,
        percentualEconomia: 15.46,
      },
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
