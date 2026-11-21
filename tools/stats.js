#!/usr/bin/env node
/* ============================================================
   tools/stats.js
   统计口径单源（问题 12/37）：从数据文件实算产品/品牌/品类/年份/图片
   全部数字，README 与页面文案以本脚本输出为准，CI 用 --check 校验一致。
   用法：
     node tools/stats.js            打印统计 JSON
     node tools/stats.js --check    校验 dist-README.md 数字与实算一致（CI）
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function loadChunks(file) {
  const w = {};
  new Function('window', fs.readFileSync(file, 'utf8'))(w);
  return w.DB_CHUNKS || [];
}

function collect() {
  const products = [];
  const seen = new Set();
  /* 精选分片：data/*.js（排除注册表文件） */
  const reserved = new Set(['manifest.js', 'categories.js', 'brand-alias.js', 'index.js']);
  for (const f of fs.readdirSync(path.join(ROOT, 'data'))) {
    if (!f.endsWith('.js') || reserved.has(f)) continue;
    for (const c of loadChunks(path.join(ROOT, 'data', f))) {
      for (const p of (c.products || [])) {
        if (!p || !p.id || seen.has(p.id)) continue;
        seen.add(p.id);
        p._chunkCat = c.category; /* 分片类别是口径基准（问题 12 孤儿分类） */
        products.push(p);
      }
    }
  }
  /* 演示分片：data/gen/bulk-static-*.js */
  for (const f of fs.readdirSync(path.join(ROOT, 'data', 'gen'))) {
    if (!/^bulk-static-.*\.js$/.test(f)) continue;
    for (const c of loadChunks(path.join(ROOT, 'data', 'gen', f))) {
      for (const p of (c.products || [])) {
        if (!p || !p.id || seen.has(p.id)) continue;
        seen.add(p.id);
        p._chunkCat = c.category;
        products.push(p);
      }
    }
  }
  /* N6：媒体/图片补充数据（data/enrich/*.js → window.DB_MEDIA）必须并入，
     否则 curatedImages/mediaLinks 只统计到分片内残留字段
     （旧注释 10/11、1,038/27 均已过期，实算 curatedImages=1,025 / mediaLinks=38） */
  const byId = new Map(products.map((p) => [p.id, p]));
  const enrichDir = path.join(ROOT, 'data', 'enrich');
  if (fs.existsSync(enrichDir)) {
    for (const f of fs.readdirSync(enrichDir)) {
      if (!f.endsWith('.js') || f.startsWith('_')) continue;
      const w = {};
      try { new Function('window', fs.readFileSync(path.join(enrichDir, f), 'utf8'))(w); } catch (e) { continue; }
      const MEDIA = w.DB_MEDIA || {};
      Object.keys(MEDIA).forEach((id) => {
        const p = byId.get(id);
        const e = MEDIA[id];
        if (!p || !e) return;
        if (e.image) p.image = e.image;
        if (e.images && e.images.length) p.images = e.images;
        if (e.media && e.media.length) p.media = e.media;
      });
    }
  }
  return products;
}

/* P3-9 评分口径说明（数据特性，非 bug，勿强行对齐）：
   精选（curated）score 为编辑综合评分，由编辑按整体体验手设；
   合成（bulk）score = 各维度均值 / 10，由生成器算出。
   两者口径不同，故部分精选 score 与维度均值差可达 0.6 以上，属预期现象。 */
function compute() {
  const products = collect();
  const curated = products.filter((p) => p.source !== 'bulk');
  const bulk = products.filter((p) => p.source === 'bulk');
  const brands = new Set(products.map((p) => p.brand));
  const brandsCurated = new Set(curated.map((p) => p.brand));
  const cats = new Set(products.map((p) => p._chunkCat));
  const leaves = new Set(products.map((p) => p.catLeaf).filter(Boolean));
  const years = products.map((p) => p.year).filter((y) => typeof y === 'number');
  /* 图片按去重 URL 计数（p.image 可能与 images[] 首图重复） */
  const imgSet = new Set();
  curated.forEach((p) => {
    if (p.image) imgSet.add(p.image);
    (Array.isArray(p.images) ? p.images : []).forEach((u) => { if (u) imgSet.add(u); });
  });
  const images = imgSet.size;
  const media = products.reduce((n, p) => n + ((p.media && p.media.length) || 0), 0);
  return {
    total: products.length,
    curated: curated.length,
    bulk: bulk.length,
    brands: brands.size,
    brandsCurated: brandsCurated.size,
    categories: cats.size,
    leavesWithProducts: leaves.size,
    yearMin: years.length ? Math.min.apply(null, years) : null,
    yearMax: years.length ? Math.max.apply(null, years) : null,
    curatedImages: images,
    mediaLinks: media
  };
}

/* P1-6：--check 过去只校验 4 项，任何其它统计字段漂移都会「假绿」。
   现在 need[] 覆盖 stats 实算输出的所有关键字段（docs 声明的口径单源）。 */
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

function checkReadme(stats) {
  /* 源码树用 dist-README.md；dist 仓库内运行时用 README.md（同一份内容） */
  const p = fs.existsSync(path.join(ROOT, 'dist-README.md'))
    ? path.join(ROOT, 'dist-README.md')
    : path.join(ROOT, 'README.md');
  const s = fs.readFileSync(p, 'utf8');
  const need = [
    [fmt(stats.total) + ' 个产品', '产品总数'],
    [String(stats.curated) + ' 精选', '精选数'],
    [fmt(stats.bulk) + ' 热门', '演示数'],
    [fmt(stats.brands) + ' 品牌', '品牌数'],
    [String(stats.brandsCurated) + ' 个精选品牌', '精选品牌数'],
    [String(stats.categories) + ' 品类', '品类数'],
    [fmt(stats.leavesWithProducts) + ' 个', '细分叶子数'],
    [stats.yearMin + '–' + stats.yearMax, '年份跨度'],
    [fmt(stats.curatedImages) + ' 图', '精选图片数'],
    [String(stats.mediaLinks) + ' 测评', '测评链接数']
  ];
  let okAll = true;
  need.forEach(([frag, label]) => {
    const hit = s.indexOf(frag) !== -1;
    console.log((hit ? '  ✓ ' : '  ✗ ') + label + '（' + frag + '）');
    if (!hit) okAll = false;
  });
  return okAll;
}

/* ============================================================
   P3 协作教训（2026-11-21）：统计口径必须可被其它脚本导入复用。
   过去本文件 require 时会直接执行 CLI 打印 JSON，导致 docs-assert.js
   之类的门禁只能在进程内重复实现一套口径（两套口径即漂移温床）。
   现在：作为模块被 require 时只导出 compute，CLI 逻辑仅在直接执行时运行。
   ============================================================ */
if (require.main === module) {
  const stats = compute();
  if (process.argv.indexOf('--check') !== -1) {
    console.log('stats.js --check：README 统计一致性');
    const okAll = checkReadme(stats);
    if (!okAll) {
      console.log('实算值：', JSON.stringify(stats));
      process.exit(1);
    }
    console.log('全部一致');
  } else {
    console.log(JSON.stringify(stats, null, 2));
  }
}

module.exports = compute();
