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

const databaseUrl = process.env.DATABASE_URL;
const usePostgres =
  databaseUrl?.startsWith('postgres://') || databaseUrl?.startsWith('postgresql://');

const sequelizeConfig = usePostgres
  ? {
      dialect: 'postgres' as const,
      url: databaseUrl,
      autoLoadModels: true,
      synchronize: true,
      models: [EnergyBill],
      dialectOptions: {
        ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 60000,
        idle: 10000,
      },
    }
  : {
      dialect: 'sqlite' as const,
      storage:
        process.env.DATABASE_PATH
          ? path.resolve(process.env.DATABASE_PATH)
          : path.join(process.cwd(), 'data', 'energy_bills.sqlite'),
      autoLoadModels: true,
      synchronize: true,
      models: [EnergyBill],
    };

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SequelizeModule.forRoot(sequelizeConfig),
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
