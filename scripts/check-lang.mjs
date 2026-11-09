import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const base = process.argv[2] || 'dist-static';

function walk(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (e.endsWith('.html')) acc.push(p);
  }
  return acc;
}

const RANGES = {
  malayalam: [0x0d00, 0x0d7f],
  devanagari: [0x0900, 0x097f],
  tamil: [0x0b80, 0x0bff],
  telugu: [0x0c00, 0x0c7f],
  kannada: [0x0c80, 0x0cdf],
  arabic: [0x0600, 0x06ff],
  cjk: [0x4e00, 0x9fff],
  cyrillic: [0x0400, 0x04ff],
  sinhala: [0x0d80, 0x0dff],
  thai: [0x0e00, 0x0e7f],
  gurmukhi: [0x0a00, 0x0a7f],
  bengali: [0x0980, 0x09ff],
};

function countRange(text, [a, b]) {
  let c = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp >= a && cp <= b) c++;
  }
  return c;
}

const files = walk(base);
const issues = [];
const THRESHOLD = 40;

for (const f of files) {
  const html = readFileSync(f, 'utf8');
  const m = html.match(/<html[^>]*lang="([^"]+)"/);
  const lang = m ? m[1] : 'unknown';
  // 仅检查可见文本：去掉 script/style/link/head 的 meta 内容，保留 body 文本
  const body = (html.match(/<body[\s\S]*?<\/body>/i) || [''])[0] ||
    html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  const text = body.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  const counts = {};
  for (const [k, [a, b]] of Object.entries(RANGES)) counts[k] = countRange(text, [a, b]);
  const nonLatin = Object.entries(counts).filter(([, c]) => c > 0);

  let problem = null;
  if (lang === 'en') {
    // 英文页只允许拉丁；其他任何非拉丁脚本大量出现即混淆
    const bad = nonLatin.filter(([k, c]) => c > THRESHOLD);
    if (bad.length) problem = bad;
  } else if (lang === 'ml-IN') {
    // home 双语：允许 malayalam + latin；其他大量出现即混淆
    const bad = nonLatin.filter(([k, c]) => k !== 'malayalam' && c > THRESHOLD);
    if (bad.length) problem = bad;
  } else {
    // 其他 lang：报告非拉丁情况供人工判断
    if (nonLatin.length) problem = nonLatin;
  }

  const summary = nonLatin.map(([k, c]) => `${k}:${c}`).join(' ') || '(only latin)';
  console.log(`${f.replace(base + '/', '')}  [${lang}]  ${summary}`);
  if (problem) issues.push({ file: f.replace(base + '/', ''), lang, problem });
}

console.log('\n=== POTENTIAL LANGUAGE CONFUSION (threshold=' + THRESHOLD + ') ===');
if (!issues.length) console.log('none');
else for (const i of issues) console.log(JSON.stringify(i));
