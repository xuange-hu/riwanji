# 日理万机 · 数码产品百科全书

> 数码产品百科：静态版 10,346 个产品 / 657 品牌 / 106 品类（在线服务版规划中）。
> 参数为公开资料编辑整理 · 每产品 ≥3 图 · 测评索引 · 品牌细分 · 横向对比 · 产品时间线。
>
> 统计口径以 `tools/stats.js` 实算为准（`node tools/stats.js --check` 校验本文数字一致）。

## 静态版（本仓库）

本仓库是**纯静态版**，由 GitHub Pages 托管：<https://xuange-hu.github.io/riwanji/>

- **10,346 个产品**：346 精选（真实图集 + 测评索引）+ 10,000 热门 SKU（演示样本自身覆盖 106 个品类 / 584 个品牌，全库合计 106 个品类 / 657 个品牌；均带 synthetic:true 溯源字段）
- 全功能可用：搜索 / 筛选 / 品牌细分 / 对比表 / 收藏 / 时间线 / 排行榜
- 产品图集：真实图片优先，不足用本地 SVG 海报变体补足（每产品保证 ≥3 图）
- 零依赖、零构建、零后端 —— 纯 HTML/CSS/JS + JSON 分片
- 统计快照（tools/stats.js 实算）：年份跨度 1954–2024 · 含产品细分叶子 1,646 个 · 192 个精选品牌

## 本地打开

直接双击 `index.html`（file:// 模式），或起任意静态服务器：

```bash
npx serve .        # 或 python -m http.server 8000
```

## 托管说明

1. 线上部署：<https://xuange-hu.github.io/riwanji/>（GitHub Pages，master 分支自动发布）
2. 任意静态托管（Netlify / Cloudflare Pages / nginx）直接托管本目录同样可用
3. 本地预览：双击 `index.html` 或 `npx serve .`

## 目录结构

```
index.html          外壳（OG/Twitter meta、theme-color、数据清单驱动）
css/style.css       主题样式（玻璃拟态 + 科技感 + 打印样式）
js/                 前端模块 7 个（util→data→state→router→components→pages→app 按依赖序加载）
img/                本地产品图（精选产品图集镜像，防盗链/热链失效不再开天窗）
data/enrich-local.js 本地图片覆盖表（url → img/…，tools/localize-images.js 生成）
data/manifest.js    数据分片清单 + 全库统计口径（86 条目：26 精选 + 50 演示 + 9 图集 + 1 轻索引）
data/*.js           精选产品分片（26 个）
data/gen/*.js       演示样本分片（50 个，source:'bulk' + synthetic:true 明确标注）
data/categories.js  品类注册表（16 大类 / 2,284 细分，106 个品类有产品收录）
data/brand-alias.js 品牌别名（搜索归一）
data/enrich/*.js    图集 + 测评链接补充（346 产品 / 1,025 图 / 38 测评）
```

## 数据来源

精选产品参数为公开资料（厂商规格页、产品说明书、公开评测等）的编辑整理，
**不附逐字段出处链接、规格版本与核验日期**，可能存在误差，购买请以厂商官方信息为准；
精选产品的「用户评分」是编辑从公开网络口碑整理的参考值，并非本站用户打分，没有评价人数与采集平台标注；演示样本的评分由生成器随机产生，无真实口碑来源。
演示样本由确定性生成器（`tools/gen-bulk-v2.js`，mulberry32 种子 20261112）按品类参数池组合生成，
每条带 `source:'bulk'` + `synthetic:true` 溯源字段并默认隐藏；
测评索引为公开文章的标题 + 链接整理（严格标题匹配 + 可达性验证），
无测评数据的产品只提供全网搜索直达入口，不冒充原文链接。

## 规划：在线服务版

支撑更大数据集的服务端检索版（Node.js API，`tools/serve.js` 为同构雏形）
在路线图中，部署方案见 `DEPLOY.md`。
