import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { BillsController } from './controllers/bills.controller';
import { BillsService } from './services/bills.service';
import { GeminiModule } from '../../gemini/gemini.module';
import { EnergyBill } from './entities/energy-bill.entity';
import { EnergyBillRepository } from './repositories/energy-bill.repository';
import { ENERGY_BILL_REPOSITORY } from './interfaces/energy-bill-repository.interface';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

@Module({
  imports: [SequelizeModule.forFeature([EnergyBill]), GeminiModule],
  controllers: [BillsController],
  providers: [
    EnergyBillRepository,
    {
      provide: ENERGY_BILL_REPOSITORY,
      useExisting: EnergyBillRepository,
    },
    BillsService,
    ApiKeyGuard,
  ],
  exports: [BillsService, ENERGY_BILL_REPOSITORY],
})
export class BillsModule {}
