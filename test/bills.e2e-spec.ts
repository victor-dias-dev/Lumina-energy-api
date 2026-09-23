import { execSync } from 'child_process';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { GeminiService } from '../src/gemini/services/gemini.service';

const extraction = {
  'Nº DO CLIENTE': '7202210726',
  'Mês de referência': 'SET/2024',
  'Energia Elétrica': { kWh: 50, valor: 25.5 },
  'Energia SCEEE s/ICMS': { kWh: 476, valor: 238 },
  'Energia compensada GD I': { kWh: 100, valor: 50 },
  'Contrib Ilum Publica Municipal': { valor: 10 },
};

describe('Bills (e2e)', () => {
  let app: INestApplication;
  let dbPath: string;

  beforeAll(async () => {
    dbPath = path.join(os.tmpdir(), `lumi-e2e-${process.pid}.sqlite`);
    for (const suffix of ['', '-shm', '-wal']) {
      fs.rmSync(`${dbPath}${suffix}`, { force: true });
    }

    process.env.NODE_ENV = 'test';
    process.env.DATABASE_PATH = dbPath;
    process.env.DATABASE_URL = '';
    process.env.API_KEY = '';
    process.env.DATABASE_SSL = 'false';
    process.env.SWAGGER_ENABLED = 'false';

    execSync('pnpm exec sequelize-cli db:migrate', {
      env: process.env,
      stdio: 'inherit',
    });

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GeminiService)
      .useValue({
        extractEnergyBillFromPdf: jest.fn().mockResolvedValue(extraction),
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app?.close();
    fs.rmSync(dbPath, { force: true });
  });

  const pdf = Buffer.from('%PDF-1.4 synthetic');

  it('uploads, lists, aggregates, and rejects a duplicate', async () => {
    const created = await request(app.getHttpServer())
      .post('/bills/upload')
      .attach('file', pdf, {
        filename: 'bill.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    expect(created.body.numero_cliente).toBe('7202210726');
    expect(Number(created.body.consumo_total_kwh)).toBe(526);

    const page = await request(app.getHttpServer())
      .get('/bills?page=1&limit=10')
      .expect(200);
    expect(page.body.page).toBe(1);
    expect(page.body.limit).toBe(10);
    expect(page.body.total).toBe(1);
    expect(page.body.data).toHaveLength(1);

    const dashboard = await request(app.getHttpServer())
      .get('/bills/dashboard')
      .expect(200);
    expect(dashboard.body.resumo.total_faturas).toBe(1);
    expect(dashboard.body.resumo.total_clientes).toBe(1);
    expect(Number(dashboard.body.energia.consumo_total_kwh)).toBe(526);
    expect(dashboard.body.series_periodo[0].mes_referencia).toBe('SET/2024');
    expect(dashboard.body.series_periodo[0].ano_referencia).toBe(2024);

    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });

    await request(app.getHttpServer()).get('/bills/999999').expect(404);

    await request(app.getHttpServer())
      .post('/bills/upload')
      .attach('file', pdf, {
        filename: 'bill.pdf',
        contentType: 'application/pdf',
      })
      .expect(409);
  });
});
