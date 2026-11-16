#!/usr/bin/env node
/* ============================================================
   tools/prerender.js
   SEO 预渲染（问题 18）：为每条精选产品生成真实 HTML 路径
   dist/p/<id>.html（含 JSON-LD Product + canonical + og 标签），
   并重写 sitemap.xml（收录首页 + 全部预渲染页）与 feed.xml（RSS，
   问题 46 更新日志通道）。hash 路由 SPA 保留为交互入口。
   用法： node tools/prerender.js
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SITE = 'https://xuange-hu.github.io/riwanji/';

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

/* 本地图片覆盖表（N17）：url → img/…；预渲染页在 /p/ 子路径，引用转 SITE 绝对 URL */
const IMG_LOCAL = (function () {
  const w = {};
  try { new Function('window', fs.readFileSync(path.join(ROOT, 'data', 'enrich-local.js'), 'utf8'))(w); } catch (e) { /* 占位缺失忽略 */ }
  return w.DB_MEDIA_LOCAL || {};
})();
function imgSrcOf(u) {
  if (!u) return '';
  return IMG_LOCAL[u] ? SITE + IMG_LOCAL[u] : u;
}

function main() {
  /* 只预渲染精选产品（真实数据）；演示数据不进搜索索引 */
  const reserved = new Set(['manifest.js', 'categories.js', 'brand-alias.js', 'index.js']);
  const products = [];
  const seen = new Set();
  for (const f of fs.readdirSync(path.join(ROOT, 'data'))) {
    if (!f.endsWith('.js') || reserved.has(f)) continue;
    for (const c of loadChunks(path.join(ROOT, 'data', f))) {
      for (const p of (c.products || [])) {
        if (!p || !p.id || seen.has(p.id) || p.source === 'bulk') continue;
        seen.add(p.id);
        p.categoryName = p.categoryName || c.categoryName || c.category || '';
        products.push(p);
      }
    }
  }

  const P = path.join(DIST, 'p');
  fs.mkdirSync(P, { recursive: true });

  const urls = [SITE];
  const feedItems = [];
  const produced = new Set();

  products.forEach((p) => {
    const file = safeFile(p.id) + '.html';
    produced.add(file);
    const url = SITE + 'p/' + file;
    urls.push(url);
    const img = imgSrcOf(p.image || (Array.isArray(p.images) && p.images[0]) || '');
    const specs = (p.specs || []).slice(0, 16).map((s) =>
      '        <tr><th>' + esc(s[0]) + '</th><td>' + esc(s[1]) + '</td></tr>').join('\n');
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      brand: { '@type': 'Brand', name: p.brand },
      description: p.summary || (p.name + ' 参数与评测'),
      image: img ? [img] : undefined,
      sku: p.id,
      category: p.categoryName || '',
      /* N5：不再用 aggregateRating(ratingCount:1) 把编辑评分冒充用户聚合
         （违反 Google 结构化数据政策）；改为如实的编辑部 Review */
      review: (p.review && p.review.objective)
        ? {
            '@type': 'Review',
            author: { '@type': 'Organization', name: '日理万机编辑部' },
            reviewBody: String(p.review.objective).slice(0, 300),
            reviewRating: (typeof p.score === 'number')
              ? { '@type': 'Rating', ratingValue: p.score, bestRating: 10 }
              : undefined
          }
        : undefined
    };
    const pros = (p.pros || []).map((x) => '          <li>' + esc(x) + '</li>').join('\n');
    const cons = (p.cons || []).map((x) => '          <li>' + esc(x) + '</li>').join('\n');
    const html = '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n' +
      '  <meta charset="utf-8" />\n' +
      '  <meta name="viewport" content="width=device-width, initial-scale=1" />\n' +
      '  <title>' + esc(p.name) + ' —— 日理万机</title>\n' +
      '  <meta name="description" content="' + esc((p.summary || p.name).slice(0, 150)) + '" />\n' +
      '  <link rel="canonical" href="' + esc(url) + '" />\n' +
      '  <meta property="og:type" content="product" />\n' +
      '  <meta property="og:title" content="' + esc(p.name) + '" />\n' +
      '  <meta property="og:url" content="' + esc(url) + '" />\n' +
      (img ? '  <meta property="og:image" content="' + esc(img) + '" />\n' : '') +
      '  <script type="application/ld+json">' + JSON.stringify(ld) + '</script>\n' +
      '  <style>body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;max-width:860px;margin:0 auto;padding:24px;line-height:1.7;color:#1a2233}h1{font-size:26px}h2{font-size:18px;margin:22px 0 8px}table{border-collapse:collapse;width:100%;margin:14px 0}th,td{border:1px solid #dde3ee;padding:8px 12px;text-align:left;font-size:14px}th{width:34%;background:#f2f5fb}a{color:#345fd8}.meta{color:#55617a;font-size:13.5px}.hero-img{max-width:100%;max-height:380px;border-radius:12px;border:1px solid #dde3ee;display:block;margin:12px 0}.pc{columns:2;gap:24px;margin:8px 0 0;padding-left:20px}.pc li{margin:4px 0;font-size:14.5px}@media(max-width:640px){.pc{columns:1}}</style>\n' +
      '</head>\n<body>\n' +
      '  <h1>' + esc(p.name) + '</h1>\n' +
      '  <p class="meta">' + esc(p.brand) + ' · ' + esc(p.year || '') + ' · ' + esc(p.priceText || '') +
      (p.categoryName ? ' · ' + esc(p.categoryName) : '') +
      (typeof p.score === 'number' ? ' · 编辑评分 ' + esc(p.score) + '/10' : '') +
      (typeof p.userScore === 'number' ? ' · 用户评分 ' + esc(p.userScore) + '/10' : '') + '</p>\n' +
      (img ? '  <img class="hero-img" src="' + esc(img) + '" alt="' + esc(p.name) + '" loading="lazy" />\n' : '') +
      (p.summary ? '  <p>' + esc(p.summary) + '</p>\n' : '') +
      (p.review && p.review.objective
        ? '  <h2>客观评测</h2>\n  <p>' + esc(String(p.review.objective).slice(0, 260)) +
          (String(p.review.objective).length > 260 ? '……' : '') + '</p>\n'
        : '') +
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
      '</body>\n</html>\n';
    fs.writeFileSync(path.join(P, file), html, 'utf8');

    feedItems.push({ title: p.name, url: url, desc: p.summary || p.name });
  });

  /* 孤儿页清理：产品下架/改名后的旧预渲染页删除（防 stale SEO 页混入索引） */
  for (const f of fs.readdirSync(P)) {
    if (f.endsWith('.html') && !produced.has(f)) {
      try { fs.unlinkSync(path.join(P, f)); console.log('  清理孤儿页: p/' + f); } catch (_) { /* noop */ }
    }
  }

  /* sitemap.xml：首页 + 预渲染页 */
  const sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => '  <url><loc>' + esc(u) + '</loc></url>').join('\n') +
    '\n</urlset>\n';
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sm, 'utf8');

  /* feed.xml：RSS 更新日志通道（问题 46），按预渲染批次生成 */
  const now = new Date().toUTCString();
  const rss = '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>\n' +
    '  <title>日理万机 · 数码产品百科全书</title>\n' +
    '  <link>' + SITE + '</link>\n' +
    '  <description>产品更新与新增词条</description>\n' +
    '  <lastBuildDate>' + now + '</lastBuildDate>\n' +
    feedItems.slice(0, 30).map((it) =>
      '  <item><title>' + esc(it.title) + '</title><link>' + esc(it.url) + '</link>' +
      '<description>' + esc(it.desc) + '</description></item>').join('\n') +
    '\n</channel></rss>\n';
  fs.writeFileSync(path.join(DIST, 'feed.xml'), rss, 'utf8');

  console.log('prerender：' + products.length + ' 个精选产品页 → dist/p/，sitemap ' + urls.length + ' 条，feed 30 条');
}

main();
