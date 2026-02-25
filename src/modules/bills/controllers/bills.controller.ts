import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BillsService } from '../services/bills.service';
import { DashboardService } from '../../dashboard/services/dashboard.service';
import { QueryBillsDto } from '../dto/query-bills.dto';
import { ParamIdDto } from '../dto/param-id.dto';

@Controller('bills')
export class BillsController {
  private readonly logger = new Logger(BillsController.name);

  constructor(
    private readonly billsService: BillsService,
    private readonly dashboardService: DashboardService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      this.logger.warn('Upload rejeitado: arquivo não enviado');
      throw new BadRequestException('Arquivo é obrigatório');
    }
    if (file.mimetype !== 'application/pdf') {
      this.logger.warn(`Upload rejeitado: tipo inválido ${file.mimetype}`);
      throw new BadRequestException('Apenas arquivos PDF são aceitos');
    }
    this.logger.log(`Upload iniciado: ${file.originalname} (${file.size} bytes)`);
    const result = await this.billsService.processPdf(file.buffer);
    this.logger.log(`Upload concluído: fatura id=${result.id}`);
    return result;
  }

  @Get()
  async list(@Query() query: QueryBillsDto) {
    this.logger.debug(`Listagem: numero_cliente=${query.numero_cliente ?? 'todos'}, mes_referencia=${query.mes_referencia ?? 'todos'}`);
    const bills = await this.billsService.findAll({
      numero_cliente: query.numero_cliente,
      mes_referencia: query.mes_referencia,
    });
    this.logger.debug(`Listagem retornou ${bills.length} fatura(s)`);
    return bills;
  }

  @Get('dashboard')
  async dashboard(@Query() query: QueryBillsDto) {
    this.logger.debug(`Dashboard: numero_cliente=${query.numero_cliente ?? 'todos'}, mes_referencia=${query.mes_referencia ?? 'todos'}`);
    return this.dashboardService.getDashboard({
      numero_cliente: query.numero_cliente,
      mes_referencia: query.mes_referencia,
    });
  }

  @Get(':id')
  async findOne(@Param() params: ParamIdDto) {
    this.logger.debug(`Buscando fatura id=${params.id}`);
    const bill = await this.billsService.findOne(params.id);
    if (!bill) {
      this.logger.warn(`Fatura não encontrada: id=${params.id}`);
      throw new BadRequestException('Fatura não encontrada');
    }
    return bill;
  }
}
