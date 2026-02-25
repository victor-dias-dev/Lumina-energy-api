import { forwardRef, Module } from '@nestjs/common';
import { DashboardService } from './services/dashboard.service';
import { BillsModule } from '../bills/bills.module';

@Module({
  imports: [
    forwardRef(() => BillsModule),
  ],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
