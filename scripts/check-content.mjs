import { readFileSync } from 'node:fs';

const src = readFileSync('src/data/topics.ts', 'utf8');
const slugRe = /slug:\s*'([^']+)'/g;
const slugs = [...src.matchAll(slugRe)].map((m) => ({ slug: m[1], idx: m.index }));
const rows = [];
for (let i = 0; i < slugs.length; i++) {
  const start = slugs[i].idx;
  const end = i + 1 < slugs.length ? slugs[i + 1].idx : src.length;
  const block = src.slice(start, end);
  const sections = (block.match(/heading:/g) || []).length;
  const faqs = (block.match(/^\s*q:/gm) || []).length;
  const related = (block.match(/related:\s*\[/g) || []).length;
  rows.push({ slug: slugs[i].slug, sections, faqs, related });
}
rows.sort((a, b) => a.sections - b.sections || a.faqs - b.faqs);
console.log('slug                            sections faqs');
for (const r of rows) {
  const flag = r.sections < 3 || r.faqs < 3 ? '  <-- THIN' : '';
  console.log(`${r.slug.padEnd(32)} ${String(r.sections).padStart(7)} ${String(r.faqs).padStart(5)}${flag}`);
}
const thin = rows.filter((r) => r.sections < 3 || r.faqs < 3);
console.log(`\nTotal topics: ${rows.length}, thin (sections<3 or faqs<3): ${thin.length}`);
