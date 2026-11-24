#!/usr/bin/env node
/* ============================================================
   tools/build-manifest.js
   扫描 data/*.js 分片文件，生成 data/manifest.js 清单。
   用法： node tools/build-manifest.js
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');

function loadChunk(file) {
  const code = fs.readFileSync(file, 'utf8');
  const window = {};
  // 分片文件只做 window.DB_CHUNKS.push(...)，安全沙盒执行
  new Function('window', code)(window);
  return window.DB_CHUNKS || [];
}

function listShards() {
  const top = fs.readdirSync(DATA_DIR)
    .filter((f) => f.endsWith('.js') && f !== 'manifest.js' && f !== 'brand-alias.js' && f !== 'categories.js' && f !== 'index.js' && f !== 'enrich-local.js' && f !== 'img-meta.js')
    .map((f) => ({ abs: path.join(DATA_DIR, f), rel: 'data/' + f }));
  const genDir = path.join(DATA_DIR, 'gen');
  const gen = fs.existsSync(genDir)
    ? fs.readdirSync(genDir).filter((f) => f.endsWith('.js'))
      .map((f) => ({ abs: path.join(genDir, f), rel: 'data/gen/' + f }))
    : [];
  return top.concat(gen).sort((a, b) => a.rel.localeCompare(b.rel));
}

function main() {
  const files = listShards();

  /* 精选分片（data/*.js）启动即加载；bulk 演示分片（data/gen/*.js）走轻索引 + 按需加载（问题 3） */
  const shards = [];
  const bulk = [];
  for (const { abs, rel } of files) {
    const f = rel;
    let count = 0;
    let category = '';
    try {
      const chunks = loadChunk(abs);
      chunks.forEach((c) => {
        category = category || c.category || '';
        count += (c.products || []).length;
      });
    } catch (e) {
      console.warn('  警告：' + f + ' 无法解析（' + e.message + '），已跳过');
      continue;
    }
    const rec = { file: f, category: category || 'unknown', count: count };
    if (rel.indexOf('data/gen/') === 0) bulk.push(rec); else shards.push(rec);
    console.log('  ✓ ' + f + '  [' + category + '] ' + count + ' 个产品');
  }

  const total = shards.reduce((n, s) => n + s.count, 0) + bulk.reduce((n, s) => n + s.count, 0);
  /* enrich 媒体分片清单一并写入 manifest，前端按清单加载（原硬编码 1..12 越界产生 404） */
  const enrichDir = path.join(DATA_DIR, 'enrich');
  const enrich = fs.existsSync(enrichDir)
    ? fs.readdirSync(enrichDir).filter((f) => f.endsWith('.js') && !f.startsWith('_')).sort()
      .map((f) => 'data/enrich/' + f)
    : [];

  /* 统计口径单源（N9）：全库目录统计写入 manifest.stats，
     首页/品类页/关于页/品牌页/og/README 全部以此为准，任何页面不再手写数字。
     口径与 tools/stats.js 一致（精选 + gen 演示分片全量实算） */
  const seenIds = new Set();
  const allProducts = [];
  const addShard = (abs, isGen) => {
    let chunks = [];
    try { chunks = loadChunk(abs); } catch (e) { return; }
    chunks.forEach((c) => {
      (c.products || []).forEach((p) => {
        if (!p || !p.id || seenIds.has(p.id)) return;
        seenIds.add(p.id);
        p._chunkCat = c.category;
        allProducts.push(p);
      });
    });
  };
  for (const { abs, rel } of files) addShard(abs, rel.indexOf('data/gen/') === 0);
  const curatedList = allProducts.filter((p) => p.source !== 'bulk');
  const bulkList = allProducts.filter((p) => p.source === 'bulk');
  const years = allProducts.map((p) => p.year).filter((y) => typeof y === 'number');
  /* 分类树规模（groups / leaves 总数）来自 data/categories.js */
  let treeGroups = null, treeLeaves = null;
  try {
    const tw = {};
    new Function('window', fs.readFileSync(path.join(DATA_DIR, 'categories.js'), 'utf8'))(tw);
    const tree = tw.DB_CATEGORY_TREE;
    if (tree && tree.stats) {
      treeGroups = tree.stats.groups != null ? tree.stats.groups : (tree.groups || []).length;
      treeLeaves = tree.stats.leaves != null ? tree.stats.leaves : null;
    }
  } catch (e) { /* 分类树缺失时留 null */ }
  const stats = {
    total: allProducts.length,
    curated: curatedList.length,
    bulk: bulkList.length,
    brands: new Set(allProducts.map((p) => p.brand)).size,
    brandsCurated: new Set(curatedList.map((p) => p.brand)).size,
    categories: new Set(allProducts.map((p) => p._chunkCat)).size,
    leavesWithProducts: new Set(allProducts.map((p) => p.catLeaf).filter(Boolean)).size,
    groups: treeGroups,
    leaves: treeLeaves,
    yearMin: years.length ? Math.min.apply(null, years) : null,
    yearMax: years.length ? Math.max.apply(null, years) : null
  };

  const header = '/* 本文件由 tools/build-manifest.js 自动生成，请勿手改 */\n';
  const body = 'window.DB_MANIFEST = ' + JSON.stringify({
    generated: true, shards: shards, bulk: bulk, enrich: enrich,
    index: 'data/index.js', stats: stats
  }, null, 2) + ';\n';
  fs.writeFileSync(path.join(DATA_DIR, 'manifest.js'), header + body, 'utf8');

  console.log('');
  console.log('已生成 data/manifest.js：精选 ' + shards.length + ' 片 + bulk ' + bulk.length +
    ' 片（懒加载）+ enrich ' + enrich.length + ' 片，共 ' + total + ' 个产品');
}

main();
