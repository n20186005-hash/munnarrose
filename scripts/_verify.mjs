// Temporary local validation helper. Not part of the production build.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const p = (x) => fileURLToPath(new URL(x, root));
const patched = ['src/pages/index.astro', 'src/pages/api/weather.json.ts'];
const backups = [];

for (const f of patched) backups.push([f, await readFile(p(f), 'utf8')]);

try {
  for (const f of patched) {
    const s = await readFile(p(f), 'utf8');
    await writeFile(p(f), s.replace('export const prerender=false;', 'export const prerender=true;'));
  }
  const r = spawnSync(process.execPath, [p('node_modules/astro/bin/astro.mjs'), 'build', '--config', 'astro.config.static.mjs'], { stdio: 'inherit', cwd: p('.') });
  if (r.status !== 0) { console.error('STATIC BUILD FAILED'); process.exit(r.status ?? 1); }
} finally {
  for (const [f, s] of backups) await writeFile(p(f), s);
}

async function htmlFiles(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) await htmlFiles(full, out);
    else if (e.name === 'index.html' || e.name === '404.html') out.push(full);
  }
  return out;
}

const base = p('dist-static/');
const files = await htmlFiles(base);
const sitemap = await readFile(join(base, 'sitemap-0.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const topicHtml = files.filter((f) => !f.endsWith('404.html'));
const failures = [];

for (const f of topicHtml) {
  const html = await readFile(f, 'utf8');
  const rel = '/' + f.slice(base.length).replace(/\\/g, '/').replace(/index\.html$/, '');
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  const lang = html.match(/<html lang="([^"]+)"/)?.[1];
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
  const h1count = (html.match(/<h1[ >]/g) || []).length;
  const expected = 'https://munnarrose.com' + rel;
  if (canonical !== expected) failures.push(`canonical ${rel}: ${canonical} != ${expected}`);
  if (h1count !== 1) failures.push(`h1 count ${rel}: ${h1count}`);
  if (!title || title.length < 12) failures.push(`title ${rel}: ${title}`);
  if (rel === '/') {
    if (lang !== 'ml-IN') failures.push(`home lang ${lang}`);
  } else if (lang !== 'en') failures.push(`guide lang ${rel}: ${lang}`);
  if (html.includes('aggregateRating') || html.includes('reviewCount')) failures.push(`rating schema ${rel}`);
  if (/noindex/.test(html) && !rel.includes('404')) failures.push(`noindex ${rel}`);
  if (!urls.includes(expected)) failures.push(`missing from sitemap: ${expected}`);
}

console.log(`\nSTATIC HTML: ${topicHtml.length} pages (+ 404)`);
console.log(`SITEMAP URLS: ${urls.length}`);
console.log(`FAILURES: ${failures.length}`);
for (const f of failures.slice(0, 30)) console.log('  - ' + f);
if (failures.length) process.exit(1);
