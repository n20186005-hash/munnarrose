# Validation status

## 本地验证结果（Node 22.12.0 + pnpm 12.4.2，hoisted 布局）

依赖安装与构建已在本机 Windows 沙箱完成：

```bash
$env:NODE_OPTIONS=""; $env:CODEBUDDY_SAFE_DELETE_SHIM_DIR=""; $env:GENIE_TRASH_DIR=""
$env:PATH="C:\Users\dcc\.workbuddy\binaries\node\versions\22.12.0;$env:PATH"
node <pnpm-tools>/pnpm/bin/pnpm.mjs install --config.node-linker=hoisted --config.confirmModulesPurge=false
node_modules\.bin\astro.cmd build   # Complete! dist/client + dist/server
```

构建产物：`dist/client`（静态资源 + sitemap-index.xml）、`dist/server`（Worker 入口）。

## 渲染校验

Cloudflare 适配器下不产出 `dist/index.html`，因此用一次临时静态构建（`--config` 指向临时配置，`outDir: ./dist-verify`）渲染 HTML 做校验，校验后临时文件与产物已删除。校验通过项：

- Title / Description / canonical / OG 全量输出且指向 `https://munnarrose.com`
- 3 个 JSON-LD：`TouristAttraction`（`@id` = `https://munnarrose.com/#attraction`、`image`、`hasMap`、`sameAs`）、`BreadcrumbList`（5 项）、`FAQPage`（12 条问答）
- JSON-LD 中不含 `aggregateRating`（评价只在页面正文展示）
- 全页唯一 H1：`Munnar Rose Garden (Munnar)`
- 评价区块 / 资料来源区块 / History 区块 / FAQ 锚点 `#reviews`、`#sources`、`#history`、`#faq` 均存在
- 来源说明「同步自 Google 地图用户评价，同步时间 2026 年 9 月；版权归原作者与 Google 地图所有」与按钮「在谷歌地图查看全部评价」已渲染
- `manifest.webmanifest`、`sw.js` 注册脚本已注入，图标 192/512（any + maskable）齐全
- `grep -E "example\.com|localhost|chrome-extension://"` 命中 0

## 本轮新增内容校验（实时天气 / 交通 / 设施 / 行程 / 季节）
临时静态构建（`prerender` 临时改为 `true` + `--config` 指向临时静态配置）渲染 HTML 后校验，校验后已还原 `prerender = false` 并删除临时文件：

- 天气模块 `#weather` 存在；当前温度 + 未来 7 天（今天 + 6 个工作日）均渲染，含体感 / 湿度 / 风 / 降水与逐日降水概率；`更新于 HH:MM（IST）` 出现；无 `undefined`
- 智能出行建议引擎：基于真实 Munnar 天气渲染「出行建议 · Smart Tips」区块，含 🔴 风险提醒（红色，当前无触发则隐藏）、🧥 出行穿搭 / 🗺️ 游玩安排 / 🎒 随身物品 三组（空分组不渲染）；额外对晴热/中雨大风/雷雨/大雾/官方预警/平稳 六类合成场景做了纯函数单测，触发逻辑正确
- 新增数据源 `uv_index_max`（紫外线）与 Open-Meteo Alerts（气象预警）；当前实况描述行含「紫外线 强/中等/弱 · 风力等级」
- 交通攻略四种方式（✈️ 飞机 / 🚆 火车 / 🚌 巴士 / 🚕 出租车）与本地接驳步骤存在
- 访客服务与周边设施区块存在，含洗手间 / 停车 / 餐饮 / 住宿 / 商超 / 加油充电
- 餐饮区块已中立化（不再出现 Saravana Bhavan 等具体商户名）
- 行程推荐（半日游 / 全日游）、按人群定制路线（亲子 / 摄影 / 无障碍）存在
- 季节策略与科普（四季气候表 + 西高止山脉生态 + 访客责任）存在
- 前端 **不出现**「免费 / 无需密钥 / 无需 API 密钥 / Open-Meteo」等字样（实现细节仅在 `src/lib/weather.ts` 服务端代码中）
- `grep -E "example\.com|localhost|chrome-extension://"` 命中 0

## 网络受限时的说明
若在无法访问 npm registry 的环境中工作，无法生成真实 `pnpm-lock.yaml`；当前仓库已包含在本机生成的 lockfile，重新安装请使用上面的 pnpm 命令（Windows 需 hoisted 布局，symlink 布局会因无开发者模式权限失败）。

