#!/usr/bin/env node
/* ============================================================
   tools/build-index.js
   从 data/gen/bulk-static-*.js 抽取轻索引 → data/index.js
   （id/名称/品牌/品类/年份/价格/标签/摘要/评分 + 分片归属），
   前端启动只加载索引（≈3MB），详情/对比时按 _shard 懒加载完整分片。
   用法： node tools/build-index.js
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GEN = path.join(ROOT, 'data', 'gen');

function loadChunk(file) {
  const w = {};
  new Function('window', fs.readFileSync(file, 'utf8'))(w);
  return w.DB_CHUNKS || [];
}

function main() {
  const entries = [];
  const cats = {};
  const files = fs.readdirSync(GEN).filter((f) => /^bulk-static-.*\.js$/.test(f)).sort();
  for (const f of files) {
    const rel = 'data/gen/' + f;
    for (const c of loadChunk(path.join(GEN, f))) {
      if (!cats[c.category]) {
        cats[c.category] = {
          name: c.categoryName || c.category,
          icon: c.icon || '📦',
          description: c.description || ''
        };
      }
      for (const p of (c.products || [])) {
        entries.push({
          id: p.id,
          name: p.name,
          brand: p.brand,
          category: c.category,
          catLeaf: p.catLeaf || c.category,
          year: p.year,
          price: p.price,
          priceText: p.priceText,
          tags: p.tags,
          summary: p.summary,
          scores: p.scores,
          score: p.score,
          userScore: p.userScore,
          source: p.source || 'bulk',
          synthetic: p.synthetic === true,
          shard: rel
        });
      }
    }
  }
  const header = '/* 本文件由 tools/build-index.js 自动生成，请勿手改（bulk 轻索引 · 供懒加载定位分片） */\n';
  const body = 'window.DB_BULK_CATS = ' + JSON.stringify(cats) + ';\n' +
    'window.DB_BULK_INDEX = ' + JSON.stringify(entries) + ';\n';
  fs.writeFileSync(path.join(ROOT, 'data', 'index.js'), header + body, 'utf8');
  console.log('已生成 data/index.js：' + entries.length + ' 条轻索引 / ' +
    Object.keys(cats).length + ' 品类 / ' + (Buffer.byteLength(body) / 1048576).toFixed(2) + 'MB');
}

main();
