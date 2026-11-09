import { readFileSync } from 'node:fs';
const file = process.argv[2] || 'dist-static/timings/index.html';
const html = readFileSync(file, 'utf8');
const body = (html.match(/<body[\s\S]*?<\/body>/i) || [''])[0];
const text = body
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<[^>]+>/g, ' ');
const seen = new Set();
let total = 0;
for (let i = 0; i < text.length; i++) {
  const cp = text.codePointAt(i);
  if (cp >= 0x0d00 && cp <= 0x0d7f) {
    total++;
    const ctx = text.slice(Math.max(0, i - 35), i + 35).replace(/\s+/g, ' ');
    seen.add(ctx);
  }
}
console.log('FILE:', file);
console.log('total malayalam chars:', total);
console.log('--- unique contexts (first 20) ---');
for (const s of [...seen].slice(0, 20)) console.log('…' + s + '…');
