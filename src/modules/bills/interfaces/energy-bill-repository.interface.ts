import { EnergyBill } from '../entities/energy-bill.entity';

export interface CreateEnergyBillData {
  numeroCliente: string;
  mesReferencia: string;
  energiaEletricaKwh: number;
  energiaEletricaValor: number;
  energiaSceeeKwh: number;
  energiaSceeeValor: number;
  energiaCompensadaKwh: number;
  energiaCompensadaValor: number;
  contribIlumPublica: number;
  consumoTotalKwh: number;
  valorTotalSemGd: number;
  economiaGd: number;
}

export interface FindAllFilters {
  numero_cliente?: string;
  mes_referencia?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedBills {
  data: EnergyBill[];
  page: number;
  limit: number;
  total: number;
}

export interface AggregatesResult {
  energia: {
    consumoTotalKwh: number;
    energiaCompensadaKwh: number;
  };
  financeiro: {
    valorTotalSemGd: number;
    economiaGd: number;
  };
}

export interface DashboardPeriodoItem {
  mesReferencia: string;
  anoReferencia: number;
  consumoTotalKwh: number;
  valorTotalSemGd: number;
  economiaGd: number;
  qtdFaturas: number;
}

export interface DashboardClienteItem {
  numeroCliente: string;
  qtdFaturas: number;
  consumoTotalKwh: number;
  valorTotalSemGd: number;
  economiaGd: number;
}

export interface DashboardResult {
  resumo: {
    totalFaturas: number;
    totalClientes: number;
  };
  energia: {
    consumoTotalKwh: number;
    energiaCompensadaKwh: number;
    consumoMedioKwh: number;
    percentualCompensado: number;
  };
  financeiro: {
    valorTotalSemGd: number;
    economiaGd: number;
    valorMedioFatura: number;
    percentualEconomia: number;
  };
  seriesPeriodo: DashboardPeriodoItem[];
  porCliente: DashboardClienteItem[];
  clientes: string[];
  periodosDisponiveis: { mesReferencia: string; anoReferencia: number }[];
}

export const ENERGY_BILL_REPOSITORY = Symbol('ENERGY_BILL_REPOSITORY');

export interface IEnergyBillRepository {
  create(data: CreateEnergyBillData): Promise<EnergyBill>;
  findByClienteAndMes(
    numeroCliente: string,
    mesReferencia: string,
  ): Promise<EnergyBill | null>;
  findById(id: number): Promise<EnergyBill | null>;
  findAll(filters: FindAllFilters): Promise<PaginatedBills>;
  getAggregates(filters: FindAllFilters): Promise<AggregatesResult>;
  getDashboard(filters: FindAllFilters): Promise<DashboardResult>;
  delete(id: number): Promise<number>;
}
