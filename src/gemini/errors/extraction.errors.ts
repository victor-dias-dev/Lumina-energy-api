export class ExtractionUnprocessableError extends Error {
  constructor(message = 'Não foi possível extrair dados do PDF') {
    super(message);
    this.name = 'ExtractionUnprocessableError';
  }
}

export class ModelUnavailableError extends Error {
  constructor(message = 'Falha ao processar fatura com IA') {
    super(message);
    this.name = 'ModelUnavailableError';
  }
}
