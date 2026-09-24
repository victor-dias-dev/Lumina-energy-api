import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  IEnergyBillRepository,
  ENERGY_BILL_REPOSITORY,
  DashboardResult,
} from '../../bills/interfaces/energy-bill-repository.interface';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @Inject(ENERGY_BILL_REPOSITORY)
    private readonly energyBillRepository: IEnergyBillRepository,
  ) {}

  async getDashboard(filters: {
    numero_cliente?: string;
    mes_referencia?: string;
  }): Promise<DashboardResult> {
    this.logger.debug(`getDashboard: filters=${JSON.stringify(filters)}`);
    const result = await this.energyBillRepository.getDashboard(filters);
    this.logger.debug(
      `getDashboard: total_faturas=${result.resumo.totalFaturas}, total_clientes=${result.resumo.totalClientes}`,
    );
    return result;
  }
}
