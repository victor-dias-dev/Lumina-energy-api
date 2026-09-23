import { Controller, Get, Logger, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DashboardService } from '../services/dashboard.service';
import { DashboardQueryDto } from '../../bills/dto/query-bills.dto';

@ApiTags('dashboard')
@Controller('bills')
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly dashboardService: DashboardService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard com métricas e agregações' })
  @ApiQuery({
    name: 'numero_cliente',
    required: false,
    description: 'Filtrar por número do cliente',
  })
  @ApiQuery({
    name: 'mes_referencia',
    required: false,
    description: 'Filtrar por mês (ex: SET/2024)',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados consolidados para dashboards',
  })
  async dashboard(@Query() query: DashboardQueryDto) {
    this.logger.debug(
      `Dashboard: numero_cliente=${query.numero_cliente ?? 'todos'}, mes_referencia=${query.mes_referencia ?? 'todos'}`,
    );
    return this.dashboardService.getDashboard({
      numero_cliente: query.numero_cliente,
      mes_referencia: query.mes_referencia,
    });
  }
}
