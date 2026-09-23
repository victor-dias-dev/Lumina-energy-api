import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { col, fn, literal, ProjectionAlias, WhereOptions } from 'sequelize';
import { EnergyBill } from '../entities/energy-bill.entity';
import {
  IEnergyBillRepository,
  CreateEnergyBillData,
  FindAllFilters,
  AggregatesResult,
  DashboardResult,
  DashboardPeriodoItem,
  DashboardClienteItem,
  PaginatedBills,
} from '../interfaces/energy-bill-repository.interface';

export { CreateEnergyBillData, FindAllFilters, AggregatesResult };

type RawRow = Record<string, unknown>;

@Injectable()
export class EnergyBillRepository implements IEnergyBillRepository {
  private readonly logger = new Logger(EnergyBillRepository.name);

  constructor(
    @InjectModel(EnergyBill)
    private readonly energyBillModel: typeof EnergyBill,
  ) {}

  async create(data: CreateEnergyBillData): Promise<EnergyBill> {
    this.logger.debug(
      `create: cliente=${data.numeroCliente}, mês=${data.mesReferencia}`,
    );
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

  async findAll(filters: FindAllFilters): Promise<PaginatedBills> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const where = this.buildWhere(filters);

    const { rows, count } = await this.energyBillModel.findAndCountAll({
      where: Object.keys(where).length ? where : undefined,
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });

    return {
      data: rows,
      page,
      limit,
      total: count,
    };
  }

  async getAggregates(filters: FindAllFilters): Promise<AggregatesResult> {
    const rows = (await this.energyBillModel.findAll({
      where: this.buildWhere(filters),
      attributes: this.sumAttributes(),
      raw: true,
    })) as unknown as RawRow[];
    const row = rows[0] ?? {};

    return {
      energia: {
        consumoTotalKwh: this.num(row.consumoTotalKwh),
        energiaCompensadaKwh: this.num(row.energiaCompensadaKwh),
      },
      financeiro: {
        valorTotalSemGd: this.num(row.valorTotalSemGd),
        economiaGd: this.num(row.economiaGd),
      },
    };
  }

  async getDashboard(filters: FindAllFilters): Promise<DashboardResult> {
    this.logger.debug(`getDashboard: filters=${JSON.stringify(filters)}`);
    const where = this.buildWhere(filters);

    const [totalsRows, seriesRows, clienteRows] = await Promise.all([
      this.energyBillModel.findAll({
        where,
        attributes: [
          [fn('COUNT', col('id')), 'totalFaturas'],
          [literal('COUNT(DISTINCT numero_cliente)'), 'totalClientes'],
          ...this.sumAttributes(),
        ],
        raw: true,
      }),
      this.energyBillModel.findAll({
        where,
        attributes: [
          'mesReferencia',
          [
            fn('COALESCE', fn('SUM', col('consumo_total_kwh')), 0),
            'consumoTotalKwh',
          ],
          [
            fn('COALESCE', fn('SUM', col('valor_total_sem_gd')), 0),
            'valorTotalSemGd',
          ],
          [fn('COALESCE', fn('SUM', col('economia_gd')), 0), 'economiaGd'],
          [fn('COUNT', col('id')), 'qtdFaturas'],
        ],
        group: ['mes_referencia'],
        raw: true,
        subQuery: false,
      }),
      this.energyBillModel.findAll({
        where,
        attributes: [
          'numeroCliente',
          [fn('COUNT', col('id')), 'qtdFaturas'],
          [
            fn('COALESCE', fn('SUM', col('consumo_total_kwh')), 0),
            'consumoTotalKwh',
          ],
          [
            fn('COALESCE', fn('SUM', col('valor_total_sem_gd')), 0),
            'valorTotalSemGd',
          ],
          [fn('COALESCE', fn('SUM', col('economia_gd')), 0), 'economiaGd'],
        ],
        group: ['numero_cliente'],
        order: [[fn('SUM', col('consumo_total_kwh')), 'DESC']],
        raw: true,
        subQuery: false,
      }),
    ]);

    const totals = ((totalsRows as unknown as RawRow[])[0] ?? {}) as RawRow;
    const totalFaturas = this.num(totals.totalFaturas);
    const totalClientes = this.num(totals.totalClientes);
    const consumoTotalKwh = this.num(totals.consumoTotalKwh);
    const energiaCompensadaKwh = this.num(totals.energiaCompensadaKwh);
    const valorTotalSemGd = this.num(totals.valorTotalSemGd);
    const economiaGd = this.num(totals.economiaGd);

    const consumoMedioKwh =
      totalFaturas > 0 ? consumoTotalKwh / totalFaturas : 0;
    const percentualCompensado =
      consumoTotalKwh > 0 ? (energiaCompensadaKwh / consumoTotalKwh) * 100 : 0;
    const valorMedioFatura =
      totalFaturas > 0 ? valorTotalSemGd / totalFaturas : 0;
    const valorBruto = valorTotalSemGd + economiaGd;
    const percentualEconomia =
      valorBruto > 0 ? (economiaGd / valorBruto) * 100 : 0;

    const seriesPeriodo: DashboardPeriodoItem[] = (
      seriesRows as unknown as RawRow[]
    )
      .map((row) => {
        const mesReferencia = this.text(row, 'mesReferencia', 'mes_referencia');
        return {
          mesReferencia,
          anoReferencia: this.yearFromReference(mesReferencia),
          consumoTotalKwh: this.num(row.consumoTotalKwh),
          valorTotalSemGd: this.num(row.valorTotalSemGd),
          economiaGd: this.num(row.economiaGd),
          qtdFaturas: this.num(row.qtdFaturas),
        };
      })
      .sort((a, b) => {
        if (a.anoReferencia !== b.anoReferencia)
          return a.anoReferencia - b.anoReferencia;
        return a.mesReferencia.localeCompare(b.mesReferencia);
      });

    const porCliente: DashboardClienteItem[] = (
      clienteRows as unknown as RawRow[]
    ).map((row) => ({
      numeroCliente: this.text(row, 'numeroCliente', 'numero_cliente'),
      qtdFaturas: this.num(row.qtdFaturas),
      consumoTotalKwh: this.num(row.consumoTotalKwh),
      valorTotalSemGd: this.num(row.valorTotalSemGd),
      economiaGd: this.num(row.economiaGd),
    }));

    this.logger.debug(
      `getDashboard: total_faturas=${totalFaturas}, total_clientes=${totalClientes}`,
    );

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
      clientes: porCliente.map((item) => item.numeroCliente).sort(),
      periodosDisponiveis: seriesPeriodo.map((item) => ({
        mesReferencia: item.mesReferencia,
        anoReferencia: item.anoReferencia,
      })),
    };
  }

  async delete(id: number): Promise<number> {
    return this.energyBillModel.destroy({
      where: { id },
    });
  }

  private buildWhere(filters: FindAllFilters): WhereOptions {
    const where: WhereOptions = {};
    if (filters.numero_cliente) where['numeroCliente'] = filters.numero_cliente;
    if (filters.mes_referencia) where['mesReferencia'] = filters.mes_referencia;
    return where;
  }

  private sumAttributes(): ProjectionAlias[] {
    return [
      [
        fn('COALESCE', fn('SUM', col('consumo_total_kwh')), 0),
        'consumoTotalKwh',
      ],
      [
        fn('COALESCE', fn('SUM', col('energia_compensada_kwh')), 0),
        'energiaCompensadaKwh',
      ],
      [
        fn('COALESCE', fn('SUM', col('valor_total_sem_gd')), 0),
        'valorTotalSemGd',
      ],
      [fn('COALESCE', fn('SUM', col('economia_gd')), 0), 'economiaGd'],
    ];
  }

  private num(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private text(row: RawRow, camel: string, snake: string): string {
    return String(row[camel] ?? row[snake] ?? '');
  }

  private yearFromReference(mesReferencia: string): number {
    const match = mesReferencia.match(/\d{4}/);
    return match ? parseInt(match[0], 10) : 0;
  }
}
