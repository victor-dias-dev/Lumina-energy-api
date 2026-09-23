import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { EnergyBillExtractionResult, EnergyBillExtractionSchema } from '../src/gemini/schemas/energy-bill.schema';
import { scoreExtraction } from '../src/gemini/eval/score-extraction';
import { GeminiService } from '../src/gemini/services/gemini.service';

const goldenDir = path.join(process.cwd(), 'fixtures', 'golden');
const cassetteDir = path.join(process.cwd(), 'fixtures', 'cassettes');

function readExtraction(filePath: string): EnergyBillExtractionResult {
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
  return EnergyBillExtractionSchema.parse(parsed);
}

async function extractLive(pdf: Buffer): Promise<EnergyBillExtractionResult> {
  const moduleRef = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({ isGlobal: true })],
    providers: [GeminiService],
  }).compile();
  const service = moduleRef.get(GeminiService);
  return service.extractEnergyBillFromPdf(pdf);
}

async function main() {
  const live = process.env.EVAL_LIVE === '1';
  const updateCassette = process.env.EVAL_UPDATE_CASSETTE === '1';
  const names = fs.readdirSync(goldenDir).filter((name) => name.endsWith('.json'));

  if (names.length === 0) {
    console.error('Nenhuma fixture em fixtures/golden');
    process.exit(1);
  }

  let matched = 0;
  let total = 0;

  for (const name of names) {
    const expected = readExtraction(path.join(goldenDir, name));
    const pdfPath = path.join(goldenDir, name.replace(/\.json$/, '.pdf'));
    const cassettePath = path.join(cassetteDir, name);
    let actual: EnergyBillExtractionResult;

    if (live) {
      if (!fs.existsSync(pdfPath)) {
        console.error(`PDF ausente para avaliação ao vivo: ${pdfPath}`);
        process.exit(1);
      }
      actual = await extractLive(fs.readFileSync(pdfPath));
      if (updateCassette) {
        fs.mkdirSync(cassetteDir, { recursive: true });
        fs.writeFileSync(cassettePath, `${JSON.stringify(actual, null, 2)}\n`);
        console.log(`Cassette atualizada: ${cassettePath}`);
      }
    } else {
      actual = readExtraction(cassettePath);
    }

    const score = scoreExtraction(expected, actual);
    matched += score.matched;
    total += score.total;
    const percent = (score.accuracy * 100).toFixed(1);
    console.log(`${name}: ${score.matched}/${score.total} (${percent}%)`);
    for (const field of score.fields.filter((item) => !item.match)) {
      console.log(`  ${field.field}: esperado=${field.expected} obtido=${field.actual}`);
    }
  }

  const accuracy = total === 0 ? 0 : matched / total;
  const source = live ? 'live' : 'cassette';
  console.log(`overall: ${(accuracy * 100).toFixed(1)}% (${names.length} bill, ${source})`);

  if (!live && accuracy < 1) {
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
