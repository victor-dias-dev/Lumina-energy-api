import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Client } from 'pg';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as path from 'path';

const logger = new Logger('Bootstrap');

async function waitForPostgres(maxAttempts = 30, delayMs = 2000): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.startsWith('postgres://') && !databaseUrl?.startsWith('postgresql://')) {
    return;
  }

  let url = databaseUrl;
  try {
    const parsed = new URL(databaseUrl);
    if (!parsed.port) parsed.port = '5432';
    url = parsed.toString();
  } catch {
    /* usar original */
  }

  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return '(parse error)';
    }
  })();
  logger.log(`Aguardando PostgreSQL em ${host}...`);

  for (let i = 0; i < maxAttempts; i++) {
    const client = new Client({
      connectionString: url,
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });
    try {
      await client.connect();
      await client.end();
      logger.log('PostgreSQL disponível');
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`Tentativa ${i + 1}/${maxAttempts}: ${msg}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error(`PostgreSQL não disponível após ${maxAttempts} tentativas`);
}

async function bootstrap() {
  const databaseUrl = process.env.DATABASE_URL;
  const usePostgres = databaseUrl?.startsWith('postgres://') || databaseUrl?.startsWith('postgresql://');

  if (usePostgres) {
    logger.log('Banco de dados: PostgreSQL');
    await waitForPostgres();
  } else {
    const dbPath = process.env.DATABASE_PATH || './data/energy_bills.sqlite';
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      logger.log(`Criando diretório do banco: ${dbDir}`);
      fs.mkdirSync(dbDir, { recursive: true });
    }
    logger.log(`Banco de dados: ${path.resolve(dbPath)}`);
  }

  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('Lumi Energy Bill API')
    .setDescription(
      'API RESTful para processamento de faturas de energia elétrica em PDF, utilizando Google Gemini para extração de dados via análise multimodal.',
    )
    .setVersion('1.0')
    .addTag('bills', 'Upload, listagem e detalhes de faturas')
    .addTag('dashboard', 'Métricas e agregações para dashboards')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;

  await app.listen(port, '0.0.0.0');
  
  logger.log(`Aplicação rodando na porta ${port}`);
  logger.log(`Swagger disponível em /api`);

  logger.log(`Aplicação rodando em http://localhost:${port}`);
  logger.log(`Swagger disponível em http://localhost:${port}/api`);
}
bootstrap().catch((err) => {
  logger.error('Falha ao iniciar aplicação', err?.stack ?? err);
  process.exit(1);
});
