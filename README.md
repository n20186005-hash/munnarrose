# Munnar Rose Garden

Astro + Tailwind CSS + TypeScript 单页景点站，面向 Cloudflare Workers，域名 `https://munnarrose.com`。

## 域名配置
只修改 `astro.config.mjs` 中的 `SITE_URL`（已设为 `https://munnarrose.com`）。设置域名后 `@astrojs/sitemap` 自动启用，canonical / Open Graph 绝对 URL 与 JSON-LD `@id` 均基于该域名生成。

## 单景点 SEO 实体绑定
所有实体变量集中在 `src/pages/index.astro` 顶部的 `entity` 常量，换景点时只改这一处即可：
`fullName / shortName / city / state / country / countryCode / postalCode / streetAddress / latitude / longitude / mapsShareUrl / mapsEmbedSrc / nearby1 / nearby2 / govtTourismUrl`。

页面已实现的 SEO 结构：
- JSON-LD：`TouristAttraction`（含 `@id`、`image`、`alternateName`、`geo`、`hasMap`、`sameAs` 外链）+ `BreadcrumbList` + `FAQPage`
- TDK：Title / Description / canonical / OG（title、description、url、image、image:alt）/ Twitter Card
- 标题层级：唯一 H1（全称 + 城市）+ 英文实体化 H2（About / History & Significance / Location & How to Visit / Landmarks & Attractions Around）
- 语义文案：首段等位声明、地理面包屑（Munnar Rose Garden → Munnar → Kerala → India）、周边语义集群
- 图片：`alt` 统一使用「景点全称 - 场景 in 城市, 国家」语义命名

## 谷歌评分与评价
- 评分 `4.3 / 5`、评价数 `10,609`，同步时间 `2026 年 9 月`，数据来自 Google Maps 用户评价。
- 仅在页面「谷歌评分与评价」区块与资料来源区块展示，**不写入 JSON-LD**（已移除 `aggregateRating`），并注明「同步自 Google 地图用户评价，同步时间 2026 年 9 月；版权归原作者与 Google 地图所有」。
- 所有 Google 外部链接（地图嵌入、maps.app.goo.gl 分享链接）均保留。

## PWA
`public/manifest.webmanifest` + `public/sw.js` + `public/offline.html`，布局中注入 `manifest`、`theme-color`、apple 安装元信息与 Service Worker 注册逻辑。图标：`icons/icon-192.png`、`icon-512.png`、`maskable-192.png`、`maskable-512.png`（any / maskable）。

## 本地开发
```bash
corepack enable
pnpm install --frozen-lockfile
pnpm build
pnpm dev
```
`pnpm build` 使用 Cloudflare 适配器，产物为 `dist/client`（静态资源）+ `dist/server`（Worker）。

## 部署
```bash
pnpm build
pnpm deploy
```
`wrangler.jsonc` 使用 Astro 7 + `@astrojs/cloudflare` 14.x 的约定：`"main": "@astrojs/cloudflare/entrypoints/server"`、`"assets": { "binding": "ASSETS", "directory": "./dist/client" }`。

## 图片说明
页面使用 Wikimedia Commons 的 Munnar Rose Garden 实景图。当前源码保留远程图片 URL 以保证版权归属与可追溯性；如需完全本地化，可将对应图片下载至 `public/images/` 并替换 `src/pages/index.astro` 中的四个 URL。

## 数据来源
- Google Maps：地址、电话、坐标、营业时间、评分与评价（同步时间 2026 年 9 月）
- Wikimedia Commons：坐标、实景照片、授权信息
- Kerala Tourism：景点与周边路线背景
- Tripadvisor / Trawell：停留时长、费用与附近景点的交叉参考

## 实时天气模块（SSR / Server Component）
- 在 `src/lib/weather.ts` 中于**服务端**调用 Open-Meteo（无需密钥的免费天气 API）获取当前天气与未来 7 天预报，模块级缓存 30 分钟；不可用时优雅降级（页面显示「天气数据暂时无法获取」），不会阻断渲染。
- 页面 `src/pages/index.astro` 已设置 `export const prerender = false`，由 Cloudflare Worker 在每次请求时服务端渲染天气。**前端页面不出现任何「免费 / 无需密钥 / Open-Meteo」字样**，仅展示温度、体感、湿度、风、降水与 7 天预报。
- WMO 天气代码映射为马拉雅拉姆语描述 + 图标。
- **智能出行建议引擎**（`buildAdvice`，纯函数、按山地景点情境优化）：基于实时天气、当日最高/最低温、降水概率、紫外线、风力、雾与官方气象预警，**直接输出游客可执行建议**，而非堆砌气象术语。输出四类：
  - 🔴 风险提醒（红色置顶）：中到大雨/雷雨/大风(≥7级)/大雾，以及官方气象预警（来自 Open-Meteo Alerts，失败则静默隐藏）。
  - 🧥 出行穿搭 / 🗺️ 游玩安排 / 🎒 随身物品：按条件多选触发，**不满足的条目直接隐藏**（空分组不渲染）。
  - 数据源新增 `uv_index_max`（紫外线）与 Open-Meteo Alerts（气象预警）；预警文案自动生成为「【⚠️气象预警】{事件} 已发布…」。

## 本轮新增 / 增强的内容
- **交通攻略**：分「飞机 / 火车 / 巴士 / 出租车」四种到达方式 + 「从 Munnar 镇到玫瑰园」本地接驳，均为类型化、中立客观描述。
- **访客服务与周边设施**：洗手间、停车、餐饮、住宿、商超、加油充电，全部以「类型」概述，**不点名任何具体商户**，符合非盈利科普站的中立定位。
- **餐饮区块中立化**：原具体商户名（Saravana Bhavan 等）已改为餐饮类型（南印度素食 / 综合菜系 / 咖啡面包房 / 酒店餐厅）。
- **行程推荐**：半日游 / 全日游通用路线 + 按人群定制（亲子家庭 / 摄影自然 / 低体力无障碍）。
- **季节策略与科普**：四季气候表（基于 Munnar 长期气候常态，约 30 年气候态）+ 西高止山脉生物多样性科普 + 访客责任清单。
- **History 丰富**：补充地名由来（三条河）与 19 世纪末茶园种植背景，使落地页更具专业科普深度。
