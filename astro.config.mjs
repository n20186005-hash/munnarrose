import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// 域名只在这里配置。未确定域名时保持空字符串即可正常构建。
const SITE_URL = 'https://munnarrose.com';

export default defineConfig({
  site: SITE_URL || undefined,
  output: 'server',
  adapter: cloudflare({ platformProxy: { enabled: true } }),
  integrations: SITE_URL ? [sitemap()] : [],
  vite: {
    plugins: [tailwindcss()]
  }
});
