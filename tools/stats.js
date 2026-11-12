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
  return products;
}

function compute() {
  const products = collect();
  const curated = products.filter((p) => p.source !== 'bulk');
  const bulk = products.filter((p) => p.source === 'bulk');
  const brands = new Set(products.map((p) => p.brand));
  const brandsCurated = new Set(curated.map((p) => p.brand));
  const cats = new Set(products.map((p) => p._chunkCat));
  const leaves = new Set(products.map((p) => p.catLeaf).filter(Boolean));
  const years = products.map((p) => p.year).filter((y) => typeof y === 'number');
  const images = curated.reduce((n, p) =>
    n + (Array.isArray(p.images) ? p.images.length : 0) + (p.image ? 1 : 0), 0);
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

function checkReadme(stats) {
  /* 源码树用 dist-README.md；dist 仓库内运行时用 README.md（同一份内容） */
  const p = fs.existsSync(path.join(ROOT, 'dist-README.md'))
    ? path.join(ROOT, 'dist-README.md')
    : path.join(ROOT, 'README.md');
  const s = fs.readFileSync(p, 'utf8');
  const need = [
    [String(stats.curated) + ' 精选', '精选数'],
    [String(stats.bulk).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' 热门', '演示数'],
    [String(stats.brands) + ' 品牌', '品牌数'],
    [stats.yearMin + '–' + stats.yearMax, '年份跨度']
  ];
  let okAll = true;
  need.forEach(([frag, label]) => {
    const hit = s.indexOf(frag) !== -1;
    console.log((hit ? '  ✓ ' : '  ✗ ') + label + '（' + frag + '）');
    if (!hit) okAll = false;
  });
  return okAll;
}

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
