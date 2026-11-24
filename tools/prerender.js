#!/usr/bin/env node
/* ============================================================
   tools/prerender.js
   SEO 预渲染（问题 18）：为每条精选产品生成真实 HTML 路径
   dist/p/<id>.html（含 JSON-LD Product + Review + BreadcrumbList、
   canonical / OG / Twitter 标签），并重写 sitemap.xml（首页 + 全部预渲染页）
   与 feed.xml（RSS 更新日志通道，问题 46）。hash 路由 SPA 保留为交互入口。

   ⚠ P3-52：本工具重写的是 dist/ 下的 sitemap.xml / feed.xml / p/*.html，
   必须从 dist 产物部署。root 源码的 sitemap.xml 仅 1 条 URL 且没有 feed.xml，
   若误从 root 部署会退化为「1 条 sitemap + RSS 丢失」。

   用法： node tools/prerender.js
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
/* 站点地址单源（问题 55）：可用 SITE_URL 环境变量改写（部署到 Gitee/自定义域名时，
   canonical/OG/RSS/sitemap/robots/返回首页链接全部跟随），默认官方 GitHub Pages */
const SITE = (process.env.SITE_URL || 'https://xuange-hu.github.io/riwanji/').replace(/\/*$/, '/');
/* 构建可复现性（2026-11-21）：过去收录时间与 sitemap lastmod 都以 new Date() 为锚点，
   导致「数据零变化」时每次构建仍会让 feed.xml / sitemap.xml 全量时间戳漂移，
   git diff 噪音巨大且产物不可复现。
   现在拆成两个概念：
     BUILD_DATE/TODAY  —— 真实构建时刻，仅用于「今天」这类展示字段；
     EPOCH_MS          —— 固定内容纪元锚点，收录时间 = 纪元 - id 哈希偏移，
                          同一份数据任何时候构建结果完全一致。 */
const BUILD_DATE = new Date();
const BUILD_MS = BUILD_DATE.getTime();
/* 内容纪元：2026-11-21T00:00:00Z。收录时间在此之前的近 90 天内按 id 稳定分布。 */
const EPOCH_MS = Date.UTC(2026, 10, 21, 0, 0, 0);

/* sitemap lastmod 的日期来源，按优先级：
   1) SOURCE_DATE_EPOCH（reproducible-builds 标准，CI 可显式钉死）
   2) git HEAD 提交日期（语义上就是「内容最后变更时间」）
   3) 内容纪元（兜底，保证仍然可复现，不依赖 wall clock）
   注意：不使用 new Date()，否则同一天构建两次结果相同、跨天就整体漂移。 */
function resolveContentDate() {
  const env = process.env.SOURCE_DATE_EPOCH;
  if (env && /^\d+$/.test(env)) return new Date(Number(env) * 1000);
  try {
    const out = require('child_process')
      .execSync('git log -1 --format=%cI', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim();
    const d = new Date(out);
    if (!isNaN(d.getTime())) return d;
  } catch (_) { /* 无 git / 权限不足：走兜底 */ }
  return new Date(EPOCH_MS);
}
const CONTENT_DATE = resolveContentDate();
const TODAY = CONTENT_DATE.toISOString().slice(0, 10);

const THEME_COLOR = '#5b8cff'; /* 与 index.html 的 theme-color 一致 */
const FAVICON = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2064%2064'%3E%3Crect%20width='64'%20height='64'%20rx='12'%20fill='%235b8cff'/%3E%3Ctext%20x='32'%20y='45'%20font-size='38'%20text-anchor='middle'%20fill='%23fff'%3ER%3C/text%3E%3C/svg%3E";
const REVIEW_LIMIT = 260; /* P3-50：JSON-LD 与可见正文统一截断长度 */

function loadChunks(file) {
  const w = {};
  new Function('window', fs.readFileSync(file, 'utf8'))(w);
  return w.DB_CHUNKS || [];
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function safeFile(id) {
  return String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
}

/* JSON-LD 安全序列化（问题 56）：< 转 \u003c，杜绝第三方字段 </script> 闭合注入 */
function safeJSON(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

/* 本地图片覆盖表（N17）：url → img/…；预渲染页在 /p/ 子路径，引用转 SITE 绝对 URL */
const IMG_LOCAL = (function () {
  const w = {};
  try { new Function('window', fs.readFileSync(path.join(ROOT, 'data', 'enrich-local.js'), 'utf8'))(w); } catch (e) { /* 占位缺失忽略 */ }
  return w.DB_MEDIA_LOCAL || {};
})();
const catalogWindow = {};
new Function('window', fs.readFileSync(path.join(ROOT, 'data', 'img-meta.js'), 'utf8'))(catalogWindow);
const byImageUrl = new Map(Object.values(catalogWindow.DB_IMG_META).map(m => [SITE + m.src, m]));
function heroImage(url, name) {
  const m = byImageUrl.get(url);
  const attrs = m ? ` width="${m.w}" height="${m.h}"` : '';
  const fallback = m ? '../' + m.src : url;
  const image = '<img class="hero-img" src="' + esc(fallback) + '" alt="' + esc(name) + '"' + attrs + ' />';
  return m ? '<picture><source type="image/webp" media="(max-width: 400px)" srcset="../' + esc(m.thumbWebp) + '" /><source type="image/webp" srcset="../' + esc(m.webp) + '" />' + image + '</picture>' : image;
}
function imgSrcOf(u) {
  if (!u) return '';
  return IMG_LOCAL[u] ? SITE + IMG_LOCAL[u] : u;
}

/* P2-27：data/enrich/media-*.js → DB_MEDIA（按产品 id 索引的真实图片 URL）。
   与 tools/serve.js 的 loadEnrich 同口径，用于给无 image 字段的精选产品回填图片，
   再经 IMG_LOCAL 映射成本地图，使每个预渲染页都有 og:image / <img> / JSON-LD image。 */
const DB_MEDIA = (function () {
  const merged = {};
  const dir = path.join(ROOT, 'data', 'enrich');
  if (!fs.existsSync(dir)) return merged;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.js')) continue;
    try {
      const w = {};
      new Function('window', 'module', fs.readFileSync(path.join(dir, f), 'utf8'))(w, {});
      Object.assign(merged, w.DB_MEDIA || {});
    } catch (e) { /* 跳过损坏的分片 */ }
  }
  return merged;
})();

/* P2-31：由产品 id 稳定 hash 映射到「近 90 天」的收录时间（非上市年份），
   带小时级错位避免大量条目同日并列；倒序输出后语义为「最近收录的产品」。 */
function stableHash(s) {
  let h = 0;
  const str = String(s);
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
function catalogDate(id) {
  const h = stableHash(id);
  const daysAgo = h % 90;
  const hoursAgo = (h >>> 8) % 24;
  /* 以固定纪元为锚（不再用 BUILD_MS），保证同一 id 永远得到同一收录时间 */
  return new Date(EPOCH_MS - daysAgo * 86400000 - hoursAgo * 3600000);
}

function main() {
  /* 只预渲染精选产品（真实数据）；演示数据不进搜索索引 */
  const reserved = new Set(['manifest.js', 'categories.js', 'brand-alias.js', 'index.js', 'enrich-local.js']);
  const products = [];
  const seen = new Set();
  for (const f of fs.readdirSync(path.join(ROOT, 'data'))) {
    if (!f.endsWith('.js') || reserved.has(f)) continue;
    for (const c of loadChunks(path.join(ROOT, 'data', f))) {
      for (const p of (c.products || [])) {
        if (!p || !p.id || seen.has(p.id) || p.source === 'bulk') continue;
        seen.add(p.id);
        p.categoryName = p.categoryName || c.categoryName || c.category || '';
        /* P2-27：按 id 回填真实图片（仅当产品本身没有时），交给 imgSrcOf 映射本地 */
        const media = DB_MEDIA[p.id];
        if (media) {
          if (!p.image && media.image) p.image = media.image;
          if ((!p.images || !p.images.length) && media.images && media.images.length) p.images = media.images;
        }
        products.push(p);
      }
    }
  }

  const P = path.join(DIST, 'p');
  fs.mkdirSync(P, { recursive: true });

  const urls = [{ loc: SITE, lastmod: TODAY }];
  const feedItems = [];
  const produced = new Set();
  const usedFiles = new Set(); /* P3-60：safeFile 冲突检测 */

  products.forEach((p) => {
    /* P3-60：非法字符统一替换 _ 可能让不同 id 撞名，冲突时追加 -2/-3… 序号，绝不覆盖 */
    const base = safeFile(p.id) || 'item';
    let file = base + '.html', seq = 2;
    while (usedFiles.has(file)) file = base + '-' + (seq++) + '.html';
    usedFiles.add(file);
    produced.add(file);
    const url = SITE + 'p/' + file;
    urls.push({ loc: url, lastmod: TODAY });

    const img = imgSrcOf(p.image || (Array.isArray(p.images) && p.images[0]) || '');
    const summary = p.summary ? String(p.summary).trim() : '';
    /* P3-51：无 summary 时用品牌/型号/年份/品类拼出有语义的 description（≥16 字符） */
    const desc = (summary || [p.brand, p.name, p.year, p.categoryName, '参数、评分与选购参考']
      .filter((x) => x != null && x !== '').join(' ')).slice(0, 150);
    const reviewObj = (p.review && p.review.objective) ? String(p.review.objective) : '';
    /* P3-50：同一 summary 变量供 JSON-LD 与可见正文共用，截断长度一致 */
    const reviewSummary = reviewObj.length > REVIEW_LIMIT ? reviewObj.slice(0, REVIEW_LIMIT) + '……' : reviewObj;

    const specs = (p.specs || []).slice(0, 16).map((s) =>
      '        <tr><th scope="row">' + esc(s[0]) + '</th><td>' + esc(s[1]) + '</td></tr>').join('\n');
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      brand: { '@type': 'Brand', name: p.brand },
      description: desc,
      image: img ? [img] : undefined,
      sku: p.id,
      category: p.categoryName || '',
      /* N5：不再用 aggregateRating(ratingCount:1) 把编辑评分冒充用户聚合
         （违反 Google 结构化数据政策）；改为如实的编辑部 Review */
      review: reviewObj ? {
        '@type': 'Review',
        author: { '@type': 'Organization', name: '日理万机编辑部' },
        reviewBody: reviewSummary,
        reviewRating: (typeof p.score === 'number')
          ? { '@type': 'Rating', ratingValue: p.score, bestRating: 10 }
          : undefined
      } : undefined
    };
    /* P3-46：面包屑结构化数据（首页 → 品类 → 产品） */
    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '日理万机', item: SITE },
        { '@type': 'ListItem', position: 2, name: p.categoryName || p.category || '产品',
          item: SITE + '#/products?cat=' + encodeURIComponent(p.category || '') },
        { '@type': 'ListItem', position: 3, name: p.name, item: url }
      ]
    };
    const pros = (p.pros || []).map((x) => '          <li>' + esc(x) + '</li>').join('\n');
    const cons = (p.cons || []).map((x) => '          <li>' + esc(x) + '</li>').join('\n');

    const html = '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n' +
      '  <meta charset="utf-8" />\n' +
      `  <meta http-equiv="Content-Security-Policy" content="object-src 'none'; base-uri 'none'; form-action 'self'" />\n` +
      '  <meta property="og:locale" content="zh_CN" />\n' +
      '  <meta name="viewport" content="width=device-width, initial-scale=1" />\n' +
      '  <title>' + esc(p.name) + ' —— 日理万机</title>\n' +
      '  <meta name="description" content="' + esc(desc) + '" />\n' +
      '  <meta name="theme-color" content="' + THEME_COLOR + '" />\n' +
      '  <link rel="icon" href="' + FAVICON + '" />\n' +
      '  <link rel="canonical" href="' + esc(url) + '" />\n' +
      /* P3-44/45：补齐 OG / Twitter 卡片标签 */
      '  <meta property="og:type" content="product" />\n' +
      '  <meta property="og:site_name" content="日理万机" />\n' +
      '  <meta property="og:title" content="' + esc(p.name) + '" />\n' +
      '  <meta property="og:description" content="' + esc(desc) + '" />\n' +
      '  <meta property="og:url" content="' + esc(url) + '" />\n' +
      (img ? '  <meta property="og:image" content="' + esc(img) + '" />\n' : '') +
      '  <meta name="twitter:card" content="' + (img ? 'summary_large_image' : 'summary') + '" />\n' +
      '  <meta name="twitter:title" content="' + esc(p.name) + '" />\n' +
      '  <meta name="twitter:description" content="' + esc(desc) + '" />\n' +
      (img ? '  <meta name="twitter:image" content="' + esc(img) + '" />\n' : '') +
      '  <script type="application/ld+json">' + safeJSON(ld) + '</script>\n' +
      '  <script type="application/ld+json">' + safeJSON(breadcrumb) + '</script>\n' +
      /* P3-18：内联样式外联为 css/prerender.css（build-dist 从 root 复制），严格 CSP 下生效 */
      '  <link rel="stylesheet" href="../css/prerender.css" />\n' +
      '</head>\n<body>\n' +
      /* 问题 65：地标结构——预渲染页补 <main>，读屏可跳转主内容 */
      '  <main>\n' +
      '  <h1>' + esc(p.name) + '</h1>\n' +
      '  <p class="meta">' + esc(p.brand) + ' · ' + esc(p.year || '') + ' · ' + esc(p.priceText || '') +
      (p.categoryName ? ' · ' + esc(p.categoryName) : '') +
      (typeof p.score === 'number' ? ' · 编辑评分 ' + esc(p.score) + '/10' : '') +
      /* 问题 52：用户评分如实标注来源（口碑整理值，非本站用户打分） */
      (typeof p.userScore === 'number' ? ' · 用户评分 ' + esc(p.userScore) + '/10（公开口碑整理值，非本站打分）' : '') + '</p>\n' +
      (img ? '  ' + heroImage(img, p.name) + '\n' : '') +
      (summary ? '  <p>' + esc(summary) + '</p>\n' : '') +
      (reviewObj ? '  <h2>客观评测</h2>\n  <p>' + esc(reviewSummary) + '</p>\n' : '') +
      (p.review && p.review.subjective
        ? '  <h2>主观点评</h2>\n  <p>' + esc(String(p.review.subjective).slice(0, 200)) +
          (String(p.review.subjective).length > 200 ? '……' : '') + '</p>\n'
        : '') +
      ((p.pros && p.pros.length) || (p.cons && p.cons.length)
        ? '  <h2>优点与不足</h2>\n  <ul class="pc">\n' +
          (pros ? pros + '\n' : '') + (cons ? cons + '\n' : '') + '  </ul>\n'
        : '') +
      (specs ? '  <h2>参数规格</h2>\n  <table><tbody>\n' + specs + '\n  </tbody></table>\n' : '') +
      '  <p><a href="' + SITE + '#/product/' + encodeURIComponent(p.id) + '">在「日理万机」中查看完整图集、评分与横向对比 →</a></p>\n' +
      '  <p class="meta"><a href="' + SITE + '">← 返回首页</a></p>\n' +
      '  </main>\n' +
      '</body>\n</html>\n';
    fs.writeFileSync(path.join(P, file), html, 'utf8');

    /* P2-31：pubDate 取「收录时间」（按 id 稳定 hash 映射到近 90 天），不再用上市年份 */
    feedItems.push({ title: p.name, url: url, desc: desc, pubDate: catalogDate(p.id) });
  });

  /* 孤儿页清理：产品下架/改名后的旧预渲染页删除（防 stale SEO 页混入索引） */
  for (const f of fs.readdirSync(P)) {
    if (f.endsWith('.html') && !produced.has(f)) {
      try { fs.unlinkSync(path.join(P, f)); console.log('  清理孤儿页: p/' + f); } catch (_) { /* noop */ }
    }
  }

  /* sitemap.xml：首页 + 预渲染页，P3-42 每条带 lastmod（构建日期 YYYY-MM-DD） */
  const sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => '  <url><loc>' + esc(u.loc) + '</loc><lastmod>' + u.lastmod + '</lastmod></url>').join('\n') +
    '\n</urlset>\n';
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sm, 'utf8');

  /* feed.xml：RSS 更新日志通道（问题 46），按预渲染批次生成。
     P2-31：pubDate 为「收录时间」，按 pubDate 倒序输出（最近的在前），
     彻底避开 new Date(year,0,1).toUTCString() 在 UTC+8 输出前一年 12/31 的时区错误。 */
  feedItems.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
  /* 构建可复现性：lastBuildDate 曾用 BUILD_DATE（= new Date()），导致每次构建都改写
     feed.xml 时间戳，产生「内容零变化但 git 有大段 diff」的噪音，也让构建非确定。
     RSS 语义上 lastBuildDate 表示「内容最后变更时间」，故取最新收录条目的 pubDate；
     无条目时退回 epoch，保证同一份数据任何时候构建产物字节一致。 */
  const feedLastBuild = feedItems.length
    ? feedItems[0].pubDate.toUTCString()
    : new Date(0).toUTCString();
  const rss = '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>\n' +
    '  <title>日理万机 · 数码产品百科全书</title>\n' +
    '  <link>' + SITE + '</link>\n' +
    '  <description>产品更新与新增词条</description>\n' +
    '  <lastBuildDate>' + feedLastBuild + '</lastBuildDate>\n' +
    feedItems.slice(0, 30).map((it) =>
      '  <item><title>' + esc(it.title) + '</title><link>' + esc(it.url) + '</link>' +
      '<guid isPermaLink="true">' + esc(it.url) + '</guid>' +
      '<pubDate>' + it.pubDate.toUTCString() + '</pubDate>' +
      '<description>' + esc(it.desc) + '</description></item>').join('\n') +
    '\n</channel></rss>\n';
  fs.writeFileSync(path.join(DIST, 'feed.xml'), rss, 'utf8');

  /* 站点地址统一改写（问题 55）：robots.txt 与 index.html 里的硬编码官方地址随 SITE_URL 走，
     自定义域名/Gitee 部署后 SEO 归属不再指向别的站点 */
  {
    const robotsPath = path.join(DIST, 'robots.txt');
    if (fs.existsSync(robotsPath)) {
      let r = fs.readFileSync(robotsPath, 'utf8');
      r = r.replace(/^Sitemap:.*$/m, 'Sitemap: ' + SITE + 'sitemap.xml');
      fs.writeFileSync(robotsPath, r, 'utf8');
    }
    const idxPath = path.join(DIST, 'index.html');
    if (fs.existsSync(idxPath)) {
      let h = fs.readFileSync(idxPath, 'utf8');
      h = h.split('https://xuange-hu.github.io/riwanji/').join(SITE);
      fs.writeFileSync(idxPath, h, 'utf8');
    }
  }

  console.log('prerender：' + products.length + ' 个精选产品页 → dist/p/，sitemap ' + urls.length + ' 条，feed 30 条，SITE=' + SITE);
}

main();
