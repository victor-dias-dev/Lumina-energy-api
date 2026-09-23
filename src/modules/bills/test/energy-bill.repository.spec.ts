import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { EnergyBillRepository } from '../repositories/energy-bill.repository';
import { EnergyBill } from '../entities/energy-bill.entity';

describe('EnergyBillRepository', () => {
  let repository: EnergyBillRepository;
  let energyBillModel: {
    create: jest.Mock;
    findOne: jest.Mock;
    findByPk: jest.Mock;
    findAll: jest.Mock;
    findAndCountAll: jest.Mock;
    destroy: jest.Mock;
  };

  beforeEach(async () => {
    energyBillModel = {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      findOne: jest.fn().mockResolvedValue(null),
      findByPk: jest.fn().mockResolvedValue(null),
      findAll: jest.fn().mockResolvedValue([]),
      findAndCountAll: jest.fn().mockResolvedValue({ rows: [], count: 0 }),
      destroy: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnergyBillRepository,
        { provide: getModelToken(EnergyBill), useValue: energyBillModel },
      ],
    }).compile();

    repository = module.get<EnergyBillRepository>(EnergyBillRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should insert and return energy bill', async () => {
      const data = {
        numeroCliente: '7202210726',
        mesReferencia: 'SET/2024',
        energiaEletricaKwh: 50,
        energiaEletricaValor: 25.5,
        energiaSceeeKwh: 476,
        energiaSceeeValor: 238,
        energiaCompensadaKwh: 100,
        energiaCompensadaValor: 50,
        contribIlumPublica: 10,
        consumoTotalKwh: 526,
        valorTotalSemGd: 273.5,
        economiaGd: 50,
      };

      const result = await repository.create(data);

      expect(energyBillModel.create).toHaveBeenCalledWith(data);
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('findByClienteAndMes', () => {
    it('should find by numeroCliente and mesReferencia', async () => {
      await repository.findByClienteAndMes('7202210726', 'SET/2024');

      expect(energyBillModel.findOne).toHaveBeenCalledWith({
        where: { numeroCliente: '7202210726', mesReferencia: 'SET/2024' },
      });
    });
  });

  describe('findById', () => {
    it('should find by primary key', async () => {
      await repository.findById(1);

      expect(energyBillModel.findByPk).toHaveBeenCalledWith(1);
    });
  });

  describe('findAll', () => {
    it('should return a page with filters', async () => {
      const result = await repository.findAll({
        numero_cliente: '7202210726',
        page: 2,
        limit: 10,
      });

      expect(energyBillModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { numeroCliente: '7202210726' },
          order: [['createdAt', 'DESC']],
          limit: 10,
          offset: 10,
        }),
      );
      expect(result).toEqual({ data: [], page: 2, limit: 10, total: 0 });
    });
  });

  describe('getAggregates', () => {
    it('should return aggregated sums', async () => {
      energyBillModel.findAll.mockResolvedValue([
        {
          consumoTotalKwh: 526,
          energiaCompensadaKwh: 100,
          valorTotalSemGd: 273.5,
          economiaGd: 50,
        },
      ]);

      const result = await repository.getAggregates({});

      expect(energyBillModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ raw: true }),
      );
      expect(result).toEqual({
        energia: { consumoTotalKwh: 526, energiaCompensadaKwh: 100 },
        financeiro: { valorTotalSemGd: 273.5, economiaGd: 50 },
      });
    });
  });

  describe('getDashboard', () => {
    it('should return full dashboard data from grouped queries', async () => {
      energyBillModel.findAll.mockImplementation(
        (options: { group?: string[] }) => {
          const group = options.group?.[0];
          if (group === 'mes_referencia') {
            return [
              {
                mesReferencia: 'SET/2024',
                consumoTotalKwh: 526,
                valorTotalSemGd: 273.5,
                economiaGd: 50,
                qtdFaturas: 1,
              },
            ];
          }
          if (group === 'numero_cliente') {
            return [
              {
                numeroCliente: '7202210726',
                qtdFaturas: 1,
                consumoTotalKwh: 526,
                valorTotalSemGd: 273.5,
                economiaGd: 50,
              },
            ];
          }
          return [
            {
              totalFaturas: 1,
              totalClientes: 1,
              consumoTotalKwh: 526,
              energiaCompensadaKwh: 100,
              valorTotalSemGd: 273.5,
              economiaGd: 50,
            },
          ];
        },
      );

      const result = await repository.getDashboard({});

      expect(energyBillModel.findAll).toHaveBeenCalledTimes(3);
      expect(result.resumo.totalFaturas).toBe(1);
      expect(result.resumo.totalClientes).toBe(1);
      expect(result.energia.consumoTotalKwh).toBe(526);
      expect(result.seriesPeriodo).toHaveLength(1);
      expect(result.seriesPeriodo[0].anoReferencia).toBe(2024);
      expect(result.porCliente).toHaveLength(1);
      expect(result.clientes).toContain('7202210726');
    });
  });

  describe('delete', () => {
    it('should delete by id', async () => {
      const result = await repository.delete(1);

      expect(energyBillModel.destroy).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toBe(1);
    });
  });
});
