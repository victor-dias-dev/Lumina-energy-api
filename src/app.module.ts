import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { SequelizeModule } from '@nestjs/sequelize';
import { ZodValidationPipe } from 'nestjs-zod';
import * as path from 'path';
import { BillsModule } from './modules/bills/bills.module';
import { GeminiModule } from './gemini/gemini.module';
import { EnergyBill } from './modules/bills/entities/energy-bill.entity';
import { SnakeCaseInterceptor } from './common/interceptors/snake-case.interceptor';

function buildPostgresConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.startsWith('postgres://') && !databaseUrl?.startsWith('postgresql://')) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    return null;
  }

  const host = parsed.hostname;
  const port = parsed.port ? parseInt(parsed.port, 10) : 5432;
  const database = parsed.pathname?.slice(1) || 'postgres';
  const username = decodeURIComponent(parsed.username || '');
  const password = decodeURIComponent(parsed.password || '');

  const useSsl = process.env.DATABASE_SSL !== 'false' && host.includes('.render.com');

  return {
    dialect: 'postgres' as const,
    host,
    port,
    database,
    username,
    password,
    autoLoadModels: true,
    synchronize: true,
    models: [EnergyBill],
    dialectOptions: {
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 60000,
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 60000,
      idle: 10000,
    },
    retry: {
      max: 10,
      match: [
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeConnectionAcquireTimeoutError/,
      ],
    },
  };
}

function buildSqliteConfig() {
  return {
    dialect: 'sqlite' as const,
    storage:
      process.env.DATABASE_PATH
        ? path.resolve(process.env.DATABASE_PATH)
        : path.join(process.cwd(), 'data', 'energy_bills.sqlite'),
    autoLoadModels: true,
    synchronize: true,
    models: [EnergyBill],
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SequelizeModule.forRootAsync({
      useFactory: () => {
        const postgresConfig = buildPostgresConfig();
        return postgresConfig ?? buildSqliteConfig();
      },
    }),
    GeminiModule,
    BillsModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SnakeCaseInterceptor,
    },
  ],
})
export class AppModule {}
