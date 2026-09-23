import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseInterceptors,
  UseGuards,
  UploadedFile,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiQuery,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { BillsService } from '../services/bills.service';
import { QueryBillsDto } from '../dto/query-bills.dto';
import { ParamIdDto } from '../dto/param-id.dto';
import { ApiKeyGuard } from '../../../common/guards/api-key.guard';
import { MAX_UPLOAD_BYTES } from '../../../common/constants';

@ApiTags('bills')
@Controller('bills')
export class BillsController {
  private readonly logger = new Logger(BillsController.name);

  constructor(private readonly billsService: BillsService) {}

  @Post('upload')
  @UseGuards(ThrottlerGuard, ApiKeyGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  @ApiOperation({ summary: 'Upload e processamento de PDF' })
  @ApiConsumes('multipart/form-data')
  @ApiHeader({
    name: 'x-api-key',
    required: false,
    description: 'Obrigatório quando a variável API_KEY está definida',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Arquivo PDF da fatura de energia (máximo 10 MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Fatura processada e salva com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Arquivo inválido, ausente ou acima de 10 MB',
  })
  @ApiResponse({ status: 401, description: 'API key ausente ou inválida' })
  @ApiResponse({
    status: 409,
    description: 'Fatura já processada (cliente + mês duplicado)',
  })
  @ApiResponse({
    status: 422,
    description: 'Não foi possível extrair dados do PDF',
  })
  @ApiResponse({ status: 429, description: 'Limite de uploads excedido' })
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
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException('Arquivo excede o limite de 10 MB');
    }
    this.logger.log(
      `Upload iniciado: ${file.originalname} (${file.size} bytes)`,
    );
    const result = await this.billsService.processPdf(file.buffer);
    this.logger.log(`Upload concluído: fatura id=${result.id}`);
    return result;
  }

  @Get()
  @ApiOperation({ summary: 'Listar faturas' })
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
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Página (default 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Itens por página (default 20, máximo 100)',
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de faturas' })
  async list(@Query() query: QueryBillsDto) {
    this.logger.debug(
      `Listagem: numero_cliente=${query.numero_cliente ?? 'todos'}, mes_referencia=${query.mes_referencia ?? 'todos'}, page=${query.page}, limit=${query.limit}`,
    );
    return this.billsService.findAll({
      numero_cliente: query.numero_cliente,
      mes_referencia: query.mes_referencia,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':id(\\d+)')
  @ApiOperation({ summary: 'Detalhe de uma fatura' })
  @ApiParam({ name: 'id', description: 'ID da fatura' })
  @ApiResponse({ status: 200, description: 'Fatura encontrada' })
  @ApiResponse({ status: 404, description: 'Fatura não encontrada' })
  async findOne(@Param() params: ParamIdDto) {
    this.logger.debug(`Buscando fatura id=${params.id}`);
    const bill = await this.billsService.findOne(params.id);
    if (!bill) {
      this.logger.warn(`Fatura não encontrada: id=${params.id}`);
      throw new NotFoundException('Fatura não encontrada');
    }
    return bill;
  }
}
