# Munnar Rose Garden

Astro + Tailwind CSS + TypeScript 单页景点站，面向 Cloudflare Workers。

## 域名配置
只修改 `astro.config.mjs` 中的 `SITE_URL`。留空时仍可构建；canonical / Open Graph 绝对 URL 会自动省略，`@astrojs/sitemap` 不启用。设置真实域名后重新构建即可自动生成 sitemap。

## 本地开发
```bash
corepack enable
pnpm install --frozen-lockfile
pnpm check
pnpm build
pnpm dev
```

## 部署
```bash
pnpm build
pnpm deploy
```

## 图片说明
页面使用 Wikimedia Commons 的 Munnar Rose Garden 实景图。当前源码保留远程图片 URL 以保证版权归属与可追溯性；如需完全本地化，可将对应图片下载至 `public/images/` 并替换 `src/pages/index.astro` 中的四个 URL。

## 数据来源
- Google Maps：地址、电话、评分、营业时间
- Wikimedia Commons：坐标、实景照片、授权信息
- Kerala Tourism：景点与周边路线背景
- Tripadvisor / Trawell：停留时长、费用与附近景点的交叉参考
