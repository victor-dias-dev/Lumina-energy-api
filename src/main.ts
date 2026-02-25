import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as path from 'path';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const dbPath = process.env.DATABASE_PATH || './data/energy_bills.sqlite';
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    logger.log(`Criando diretório do banco: ${dbDir}`);
    fs.mkdirSync(dbDir, { recursive: true });
  }
  logger.log(`Banco de dados: ${path.resolve(dbPath)}`);

  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Aplicação rodando em http://localhost:${port}`);
}
bootstrap().catch((err) => {
  logger.error('Falha ao iniciar aplicação', err?.stack ?? err);
  process.exit(1);
});
