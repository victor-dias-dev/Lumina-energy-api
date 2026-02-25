import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { EnergyBill } from '../entities/energy-bill.entity';
import {
  IEnergyBillRepository,
  CreateEnergyBillData,
  FindAllFilters,
  AggregatesResult,
  DashboardResult,
  DashboardPeriodoItem,
  DashboardClienteItem,
} from '../interfaces/energy-bill-repository.interface';

export { CreateEnergyBillData, FindAllFilters, AggregatesResult };

@Injectable()
export class EnergyBillRepository implements IEnergyBillRepository {
  private readonly logger = new Logger(EnergyBillRepository.name);

  constructor(
    @InjectModel(EnergyBill)
    private readonly energyBillModel: typeof EnergyBill,
  ) {}

  async create(data: CreateEnergyBillData): Promise<EnergyBill> {
    this.logger.debug(`create: cliente=${data.numeroCliente}, mês=${data.mesReferencia}`);
    const created = await this.energyBillModel.create(data as never);
    this.logger.debug(`create: id=${created.id}`);
    return created;
  }

  async findByClienteAndMes(
    numeroCliente: string,
    mesReferencia: string,
  ): Promise<EnergyBill | null> {
    return this.energyBillModel.findOne({
      where: {
        numeroCliente,
        mesReferencia,
      },
    });
  }

  async findById(id: number): Promise<EnergyBill | null> {
    return this.energyBillModel.findByPk(id);
  }

  async findAll(filters: FindAllFilters): Promise<EnergyBill[]> {
    const where: Record<string, unknown> = {};

    if (filters.numero_cliente) {
      where.numeroCliente = filters.numero_cliente;
    }
    if (filters.mes_referencia) {
      where.mesReferencia = filters.mes_referencia;
    }

    return this.energyBillModel.findAll({
      where: Object.keys(where).length ? where : undefined,
      order: [['createdAt', 'DESC']],
    });
  }

  async getAggregates(filters: FindAllFilters): Promise<AggregatesResult> {
    const where: Record<string, unknown> = {};

    if (filters.numero_cliente) {
      where.numeroCliente = filters.numero_cliente;
    }
    if (filters.mes_referencia) {
      where.mesReferencia = filters.mes_referencia;
    }

    const whereOptions = Object.keys(where).length ? { where } : {};

    const [consumoTotalKwh, energiaCompensadaKwh, valorTotalSemGd, economiaGd] =
      await Promise.all([
        this.energyBillModel.sum('consumoTotalKwh', whereOptions),
        this.energyBillModel.sum('energiaCompensadaKwh', whereOptions),
        this.energyBillModel.sum('valorTotalSemGd', whereOptions),
        this.energyBillModel.sum('economiaGd', whereOptions),
      ]);

    return {
      energia: {
        consumoTotalKwh: Number(consumoTotalKwh) || 0,
        energiaCompensadaKwh: Number(energiaCompensadaKwh) || 0,
      },
      financeiro: {
        valorTotalSemGd: Number(valorTotalSemGd) || 0,
        economiaGd: Number(economiaGd) || 0,
      },
    };
  }

  async getDashboard(filters: FindAllFilters): Promise<DashboardResult> {
    this.logger.debug(`getDashboard: filters=${JSON.stringify(filters)}`);
    const where: Record<string, unknown> = {};
    if (filters.numero_cliente) where.numeroCliente = filters.numero_cliente;
    if (filters.mes_referencia) where.mesReferencia = filters.mes_referencia;
    const whereOptions = Object.keys(where).length ? { where } : {};

    const bills = await this.energyBillModel.findAll({
      ...whereOptions,
      attributes: [
        'numeroCliente',
        'mesReferencia',
        'consumoTotalKwh',
        'energiaCompensadaKwh',
        'valorTotalSemGd',
        'economiaGd',
      ],
      raw: true,
    });

    const totalFaturas = bills.length;
    const clientesSet = new Set(bills.map((b) => b.numeroCliente));
    const totalClientes = clientesSet.size;

    const consumoTotalKwh = bills.reduce((s, b) => s + Number(b.consumoTotalKwh || 0), 0);
    const energiaCompensadaKwh = bills.reduce(
      (s, b) => s + Number(b.energiaCompensadaKwh || 0),
      0,
    );
    const valorTotalSemGd = bills.reduce(
      (s, b) => s + Number(b.valorTotalSemGd || 0),
      0,
    );
    const economiaGd = bills.reduce((s, b) => s + Number(b.economiaGd || 0), 0);

    const consumoMedioKwh = totalFaturas > 0 ? consumoTotalKwh / totalFaturas : 0;
    const percentualCompensado =
      consumoTotalKwh > 0 ? (energiaCompensadaKwh / consumoTotalKwh) * 100 : 0;
    const valorMedioFatura = totalFaturas > 0 ? valorTotalSemGd / totalFaturas : 0;
    const valorBruto = valorTotalSemGd + economiaGd;
    const percentualEconomia =
      valorBruto > 0 ? (economiaGd / valorBruto) * 100 : 0;

    const periodoMap = new Map<
      string,
      {
        consumoTotalKwh: number;
        valorTotalSemGd: number;
        economiaGd: number;
        qtdFaturas: number;
      }
    >();
    for (const b of bills) {
      const key = b.mesReferencia;
      const curr = periodoMap.get(key) || {
        consumoTotalKwh: 0,
        valorTotalSemGd: 0,
        economiaGd: 0,
        qtdFaturas: 0,
      };
      curr.consumoTotalKwh += Number(b.consumoTotalKwh || 0);
      curr.valorTotalSemGd += Number(b.valorTotalSemGd || 0);
      curr.economiaGd += Number(b.economiaGd || 0);
      curr.qtdFaturas += 1;
      periodoMap.set(key, curr);
    }

    const seriesPeriodo: DashboardPeriodoItem[] = Array.from(periodoMap.entries())
      .map(([mesReferencia, agg]) => {
        const anoMatch = mesReferencia.match(/\d{4}/);
        const anoReferencia = anoMatch ? parseInt(anoMatch[0], 10) : 0;
        return {
          mesReferencia,
          anoReferencia,
          consumoTotalKwh: agg.consumoTotalKwh,
          valorTotalSemGd: agg.valorTotalSemGd,
          economiaGd: agg.economiaGd,
          qtdFaturas: agg.qtdFaturas,
        };
      })
      .sort((a, b) => {
        if (a.anoReferencia !== b.anoReferencia)
          return a.anoReferencia - b.anoReferencia;
        return a.mesReferencia.localeCompare(b.mesReferencia);
      });

    const clienteMap = new Map<
      string,
      {
        consumoTotalKwh: number;
        valorTotalSemGd: number;
        economiaGd: number;
        qtdFaturas: number;
      }
    >();
    for (const b of bills) {
      const key = b.numeroCliente;
      const curr = clienteMap.get(key) || {
        consumoTotalKwh: 0,
        valorTotalSemGd: 0,
        economiaGd: 0,
        qtdFaturas: 0,
      };
      curr.consumoTotalKwh += Number(b.consumoTotalKwh || 0);
      curr.valorTotalSemGd += Number(b.valorTotalSemGd || 0);
      curr.economiaGd += Number(b.economiaGd || 0);
      curr.qtdFaturas += 1;
      clienteMap.set(key, curr);
    }

    const porCliente: DashboardClienteItem[] = Array.from(clienteMap.entries())
      .map(([numeroCliente, agg]) => ({
        numeroCliente,
        qtdFaturas: agg.qtdFaturas,
        consumoTotalKwh: agg.consumoTotalKwh,
        valorTotalSemGd: agg.valorTotalSemGd,
        economiaGd: agg.economiaGd,
      }))
      .sort((a, b) => b.consumoTotalKwh - a.consumoTotalKwh);

    const periodosSet = new Set(
      seriesPeriodo.map((p) => `${p.mesReferencia}|${p.anoReferencia}`),
    );
    const periodosDisponiveis = Array.from(periodosSet)
      .map((s) => {
        const [mesReferencia, ano] = s.split('|');
        return { mesReferencia, anoReferencia: parseInt(ano, 10) };
      })
      .sort((a, b) => {
        if (a.anoReferencia !== b.anoReferencia)
          return a.anoReferencia - b.anoReferencia;
        return a.mesReferencia.localeCompare(b.mesReferencia);
      });

    this.logger.debug(`getDashboard: total_faturas=${totalFaturas}, total_clientes=${totalClientes}`);

    return {
      resumo: { totalFaturas, totalClientes },
      energia: {
        consumoTotalKwh,
        energiaCompensadaKwh,
        consumoMedioKwh,
        percentualCompensado,
      },
      financeiro: {
        valorTotalSemGd,
        economiaGd,
        valorMedioFatura,
        percentualEconomia,
      },
      seriesPeriodo,
      porCliente,
      clientes: Array.from(clientesSet).sort(),
      periodosDisponiveis,
    };
  }

  async delete(id: number): Promise<number> {
    return this.energyBillModel.destroy({
      where: { id },
    });
  }
}
