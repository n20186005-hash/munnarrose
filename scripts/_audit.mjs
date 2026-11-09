// Temporary local audit helper. Not part of the production build.
import { readFile, readdir, access } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const base = fileURLToPath(new URL('../dist-static/', import.meta.url));
const fails = [];
const notes = [];

async function htmlFiles(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) await htmlFiles(full, out);
    else if (e.name === 'index.html') out.push(full);
  }
  return out;
}

const files = await htmlFiles(base);
const hrefs = new Set();
const titles = new Set();
const descriptions = new Set();
let faqVisible = 0, faqSchema = 0, breadcrumbs = 0, webpages = 0, aboutLinks = 0, photoCredits = 0;

for (const f of files) {
  const html = await readFile(f, 'utf8');
  const rel = '/' + f.slice(base.length).split(sep).join('/').replace(/index\.html$/, '');
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
  if (titles.has(title)) fails.push(`duplicate title: ${title}`);
  if (descriptions.has(desc)) fails.push(`duplicate description: ${rel}`);
  titles.add(title); descriptions.add(desc);
  if (!html.includes('og:site_name')) fails.push(`missing og:site_name ${rel}`);
  if (html.includes('www.munnarrose.com')) fails.push(`www canonical leak ${rel}`);
  if (html.includes('10,766')) fails.push(`stale review count ${rel}`);
  if (/₹\s?\d/.test(html) && !html.includes('different, similarly named rose garden')) {
    // The ₹50 caution is allowed only on the entry-fee topic.
    if (rel !== '/entry-fee/') fails.push(`unexpected price ${rel}`);
  }
  for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) hrefs.add(m[1]);
  const details = (html.match(/<details class="card"/g) || []).length;
  faqVisible += details;
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const ld = JSON.parse(m[1]);
      if (ld['@type'] === 'FAQPage') faqSchema += ld.mainEntity?.length ?? 0;
      if (ld['@type'] === 'BreadcrumbList') breadcrumbs++;
      if (ld['@type'] === 'WebPage' || ld['@type'] === 'CollectionPage') {
        webpages++;
        if (JSON.stringify(ld.about ?? '').includes('#attraction')) aboutLinks++;
      }
      if (JSON.stringify(ld).includes('aggregateRating')) fails.push(`aggregateRating ${rel}`);
    } catch { fails.push(`invalid JSON-LD ${rel}`); }
  }
  if (html.includes('CC BY-SA 4.0')) photoCredits++;
}

const sitemap = await readFile(join(base, 'sitemap-0.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (urls.length !== 43) fails.push(`sitemap count ${urls.length} != 43`);
if (new Set(urls).size !== urls.length) fails.push('duplicate sitemap URLs');
if (urls.some((u) => !u.startsWith('https://munnarrose.com/'))) fails.push('non-canonical sitemap URL');

const broken = [];
for (const h of hrefs) {
  if (h === '/' || h.startsWith('/_astro/') || h.startsWith('/images/') || h.startsWith('/icons/')) continue;
  const clean = h.replace(/\/$/, '');
  const candidate = join(base, clean, 'index.html');
  const asFile = join(base, h.replace(/^\//, ''));
  try { await access(candidate); }
  catch { try { await access(asFile); } catch { broken.push(h); } }
}
if (broken.length) fails.push(`broken internal links: ${broken.slice(0, 20).join(', ')}`);

const home = await readFile(join(base, 'index.html'), 'utf8');
if (!home.includes('Munnar Rose Garden – Timings, Entry Fee, Flowers &amp; Visitor Guide') && !home.includes('Munnar Rose Garden – Timings, Entry Fee, Flowers & Visitor Guide')) fails.push('home title not applied');
if (!home.includes('id="guides"')) fails.push('home guide cluster missing');
if (!home.includes('Directions / Google Maps')) fails.push('home directions CTA missing');
if ((home.match(/flowerbed-2017-1600\.jpg/g) || []).length < 1) fails.push('home hero photo changed');
if (!home.includes('flower-2017-900.jpg') || !home.includes('pond-2017-900.jpg')) fails.push('gallery photos changed');
if (!home.includes('10,727')) fails.push('home rating snapshot changed');
if (!home.includes('href="/guides/"')) fails.push('home nav guides link missing');

notes.push(`pages=${files.length} sitemap=${urls.length} uniqueTitles=${titles.size} uniqueDescriptions=${descriptions.size}`);
notes.push(`faqVisible=${faqVisible} faqSchemaQuestions=${faqSchema} breadcrumbSchemas=${breadcrumbs} pageSchemas=${webpages} aboutAttraction=${aboutLinks}`);
notes.push(`internalHrefs=${hrefs.size} photoCreditPages=${photoCredits}`);
console.log(notes.join('\n'));
console.log(`AUDIT FAILURES: ${fails.length}`);
for (const f of fails.slice(0, 40)) console.log('  - ' + f);
if (fails.length) process.exit(1);
