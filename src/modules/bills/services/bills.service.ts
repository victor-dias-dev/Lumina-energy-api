import {
  Injectable,
  Inject,
  ConflictException,
  ServiceUnavailableException,
  UnprocessableEntityException,
  Logger,
} from '@nestjs/common';
import { GeminiService } from '../../../gemini/services/gemini.service';
import { EnergyBillExtractionResult } from '../../../gemini/schemas/energy-bill.schema';
import {
  IEnergyBillRepository,
  ENERGY_BILL_REPOSITORY,
} from '../interfaces/energy-bill-repository.interface';

@Injectable()
export class BillsService {
  private readonly logger = new Logger(BillsService.name);

  constructor(
    @Inject(ENERGY_BILL_REPOSITORY)
    private readonly energyBillRepository: IEnergyBillRepository,
    private readonly geminiService: GeminiService,
  ) {}

  async processPdf(buffer: Buffer) {
    this.logger.log(`Processando PDF (${buffer.length} bytes)`);

    let extraction: EnergyBillExtractionResult;

    try {
      extraction = await this.geminiService.extractEnergyBillFromPdf(buffer);
      this.logger.debug(`Extração concluída: cliente=${extraction['Nº DO CLIENTE']}, mês=${extraction['Mês de referência']}`);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Erro na extração: ${error.message}`, error.stack);
        if (error.message.includes('No response') || error.message.includes('Missing required')) {
          throw new UnprocessableEntityException(
            'Não foi possível extrair dados do PDF',
          );
        }
      }
      throw new ServiceUnavailableException(
        'Falha ao processar fatura com IA',
      );
    }

    const data = this.calculateAndMap(extraction);
    this.logger.debug(`Dados calculados: consumo_total=${data.consumoTotalKwh}kWh, valor=${data.valorTotalSemGd}`);

    const existing = await this.energyBillRepository.findByClienteAndMes(
      data.numeroCliente,
      data.mesReferencia,
    );

    if (existing) {
      this.logger.warn(`Fatura duplicada: cliente=${data.numeroCliente}, mês=${data.mesReferencia}`);
      throw new ConflictException(
        'Fatura já processada para este cliente e mês',
      );
    }

    const created = await this.energyBillRepository.create(data);
    this.logger.log(`Fatura criada: id=${created.id}, cliente=${data.numeroCliente}`);
    return created;
  }

  private calculateAndMap(extraction: EnergyBillExtractionResult) {
    const ee = extraction['Energia Elétrica'];
    const sceee = extraction['Energia SCEEE s/ICMS'];
    const gd = extraction['Energia compensada GD I'];
    const contrib = extraction['Contrib Ilum Publica Municipal'];

    const energiaEletricaKwh = Number(ee.kWh) || 0;
    const energiaEletricaValor = Number(ee.valor) || 0;
    const energiaSceeeKwh = Number(sceee.kWh) || 0;
    const energiaSceeeValor = Number(sceee.valor) || 0;
    const energiaCompensadaKwh = Number(gd.kWh) || 0;
    const energiaCompensadaValor = Number(gd.valor) || 0;
    const contribIlumPublica = Number(contrib.valor) || 0;

    const consumoTotalKwh = energiaEletricaKwh + energiaSceeeKwh;
    const valorTotalSemGd =
      energiaEletricaValor + energiaSceeeValor + contribIlumPublica;
    const economiaGd = energiaCompensadaValor;

    return {
      numeroCliente: String(extraction['Nº DO CLIENTE'] || '').trim(),
      mesReferencia: String(extraction['Mês de referência'] || '').trim(),
      energiaEletricaKwh,
      energiaEletricaValor,
      energiaSceeeKwh,
      energiaSceeeValor,
      energiaCompensadaKwh,
      energiaCompensadaValor,
      contribIlumPublica,
      consumoTotalKwh,
      valorTotalSemGd,
      economiaGd,
    };
  }

  async findAll(filters: { numero_cliente?: string; mes_referencia?: string }) {
    return this.energyBillRepository.findAll(filters);
  }

  async findOne(id: number) {
    return this.energyBillRepository.findById(id);
  }
}
