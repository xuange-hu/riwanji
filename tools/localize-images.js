#!/usr/bin/env node
/* ============================================================
   tools/localize-images.js
   图片本地化（问题 20）：把精选产品热链图片下载到 dist/img/，
   并生成 data/enrich-local.js 覆盖表（id → 本地路径），构建时注入。
   热链防盗链变化不再全站开天窗；下载失败保留 onerror 海报字降级。
   用法：
     node tools/localize-images.js            下载全部（断点续传，跳过已存在）
     node tools/localize-images.js --limit 50 只处理前 50 张（试跑）
   注意：1,038 张全量下载体积较大（约 100-300MB），按需执行；
        下载后需重跑 build-dist.js 才会把 img/ 打进部署包。
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const IMG = path.join(ROOT, 'dist', 'img');
const OUT = path.join(ROOT, 'data', 'enrich-local.js');
const CONCURRENCY = 6;

function loadChunks(file) {
  const w = {};
  new Function('window', fs.readFileSync(file, 'utf8'))(w);
  return w.DB_CHUNKS || [];
}

function fetchOne(url, dest) {
  return new Promise((resolve) => {
    const mod = url.indexOf('https:') === 0 ? https : http;
    const req = mod.get(url, { timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0 (riwanji-image-mirror)', Referer: '' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        fetchOne(res.headers.location, dest).then(resolve);
        return;
      }
      if (res.statusCode !== 200) { res.resume(); resolve(false); return; }
      const f = fs.createWriteStream(dest);
      res.pipe(f);
      f.on('finish', () => { f.close(); resolve(true); });
      f.on('error', () => resolve(false));
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function main() {
  fs.mkdirSync(IMG, { recursive: true });
  const limitIdx = process.argv.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(process.argv[limitIdx + 1], 10) : Infinity;

  /* 收集精选产品的全部图片 URL（image + images） */
  const reserved = new Set(['manifest.js', 'categories.js', 'brand-alias.js', 'index.js']);
  const jobs = []; /* { id, url, file } */
  const seen = new Set();
  let n = 0;
  for (const f of fs.readdirSync(path.join(ROOT, 'data'))) {
    if (!f.endsWith('.js') || reserved.has(f)) continue;
    for (const c of loadChunks(path.join(ROOT, 'data', f))) {
      for (const p of (c.products || [])) {
        if (!p || !p.id || p.source === 'bulk') continue;
        const urls = [].concat(p.image || [], p.images || []).filter(Boolean);
        urls.forEach((u, i) => {
          if (typeof u !== 'string' || !/^https?:\/\//.test(u) || seen.has(u)) return;
          if (n >= limit) return;
          seen.add(u);
          n++;
          const ext = (u.match(/\.(jpe?g|png|webp|gif)(\?|$)/i) || [, 'jpg'])[1].toLowerCase().replace('jpeg', 'jpg');
          jobs.push({ id: p.id, idx: i, url: u, file: String(p.id).replace(/[^a-zA-Z0-9_-]/g, '_') + '-' + i + '.' + ext });
        });
      }
    }
  }

  console.log('待处理图片：' + jobs.length + ' 张 → dist/img/');
  const map = {}; /* id -> [local urls] */
  let done = 0, ok = 0;
  const queue = jobs.slice();

  async function worker() {
    while (queue.length) {
      const j = queue.shift();
      const dest = path.join(IMG, j.file);
      let good = fs.existsSync(dest) && fs.statSync(dest).size > 0;
      if (!good) good = await fetchOne(j.url, dest);
      done++;
      if (good) {
        ok++;
        (map[j.id] = map[j.id] || []).push('img/' + j.file);
      }
      if (done % 25 === 0) console.log('  进度 ' + done + '/' + jobs.length + '（成功 ' + ok + '）');
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));

  /* 覆盖表：build-dist 注入后，前端 enrich 合并时优先生效 */
  const body = '/* 本文件由 tools/localize-images.js 自动生成：本地图片覆盖表 */\n' +
    'window.DB_MEDIA_LOCAL = ' + JSON.stringify(map) + ';\n';
  fs.writeFileSync(OUT, body, 'utf8');
  console.log('完成：成功 ' + ok + '/' + jobs.length + '，覆盖表 → data/enrich-local.js（' + Object.keys(map).length + ' 个产品）');
  console.log('下一步：node tools/build-dist.js 把 img/ 与覆盖表打进部署包');
}

main();
