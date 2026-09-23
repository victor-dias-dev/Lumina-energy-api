/**
 * Builds the synthetic sample bill PDF checked in under fixtures/golden.
 * The text is fake and exists so a live eval has a file to send. It is not a real utility bill.
 */
const fs = require('fs');
const path = require('path');

const lines = [
  'N DO CLIENTE: 1000000001',
  'Mes de referencia: SET/2024',
  'Energia Eletrica kWh 50 valor 25.50',
  'Energia SCEEE s/ICMS kWh 476 valor 238.00',
  'Energia compensada GD I kWh 100 valor 50.00',
  'Contrib Ilum Publica Municipal valor 10.00',
];

function buildPdf(textLines) {
  const stream =
    'BT\n/F1 12 Tf\n72 740 Td\n' +
    textLines
      .map((line, index) => {
        const escaped = line.replace(/[()\\]/g, '\\$&');
        return index === 0 ? `(${escaped}) Tj\n` : `0 -18 Td (${escaped}) Tj\n`;
      })
      .join('') +
    'ET';

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let body = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefPosition = Buffer.byteLength(body);
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    xref += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  body += xref;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPosition}\n%%EOF\n`;
  return Buffer.from(body);
}

const destination = path.join(__dirname, '..', 'fixtures', 'golden', 'sample-bill.pdf');
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, buildPdf(lines));
console.log(`Wrote ${destination}`);
