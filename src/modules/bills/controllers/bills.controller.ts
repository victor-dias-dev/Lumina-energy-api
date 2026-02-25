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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { BillsService } from '../services/bills.service';
import { DashboardService } from '../../dashboard/services/dashboard.service';
import { QueryBillsDto } from '../dto/query-bills.dto';
import { ParamIdDto } from '../dto/param-id.dto';

@ApiTags('bills')
@Controller('bills')
export class BillsController {
  private readonly logger = new Logger(BillsController.name);

  constructor(
    private readonly billsService: BillsService,
    private readonly dashboardService: DashboardService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload e processamento de PDF' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Arquivo PDF da fatura de energia',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Fatura processada e salva com sucesso' })
  @ApiResponse({ status: 400, description: 'Arquivo inválido ou não-PDF' })
  @ApiResponse({ status: 409, description: 'Fatura já processada (cliente + mês duplicado)' })
  @ApiResponse({ status: 422, description: 'Não foi possível extrair dados do PDF' })
  @ApiResponse({ status: 503, description: 'Falha ao processar fatura com IA' })
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
  @ApiOperation({ summary: 'Listar faturas' })
  @ApiQuery({ name: 'numero_cliente', required: false, description: 'Filtrar por número do cliente' })
  @ApiQuery({ name: 'mes_referencia', required: false, description: 'Filtrar por mês (ex: SET/2024)' })
  @ApiResponse({ status: 200, description: 'Lista de faturas' })
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
  @ApiOperation({ summary: 'Dashboard com métricas e agregações' })
  @ApiQuery({ name: 'numero_cliente', required: false, description: 'Filtrar por número do cliente' })
  @ApiQuery({ name: 'mes_referencia', required: false, description: 'Filtrar por mês (ex: SET/2024)' })
  @ApiResponse({ status: 200, description: 'Dados consolidados para dashboards' })
  async dashboard(@Query() query: QueryBillsDto) {
    this.logger.debug(`Dashboard: numero_cliente=${query.numero_cliente ?? 'todos'}, mes_referencia=${query.mes_referencia ?? 'todos'}`);
    return this.dashboardService.getDashboard({
      numero_cliente: query.numero_cliente,
      mes_referencia: query.mes_referencia,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de uma fatura' })
  @ApiParam({ name: 'id', description: 'ID da fatura' })
  @ApiResponse({ status: 200, description: 'Fatura encontrada' })
  @ApiResponse({ status: 400, description: 'Fatura não encontrada' })
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
