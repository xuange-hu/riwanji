#!/usr/bin/env node
/* ============================================================
   tools/build-dist.js
   构建 Gitee Pages 纯静态部署包 dist/：
     index.html / css / js / data/*.js（精选+gen 分片）/ data/enrich/media-*.js
   排除：data/bulk/*.jsonl（4.7GB 服务端专用）、缓存 json、tools、node_modules
   用法：node tools/build-dist.js
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

function cp(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function rmrf(p) {
  if (!fs.existsSync(p)) return;
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    const c = path.join(p, e.name);
    if (e.isDirectory()) rmrf(c);
    else {
      // 安全删除 shim（genie-trash）可能超时抛错，容错跳过：后续 copyFileSync 本身是覆盖写
      try { fs.unlinkSync(c); } catch (_) { /* noop */ }
    }
  }
  try { fs.rmdirSync(p); } catch (_) { /* noop */ }
}

// 跳过整树删除：安全删除 shim（genie-trash）逐文件超时太慢。
// 文件集稳定，copyFileSync 覆盖写即可；残留孤儿文件不影响运行。
if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });

/* 1. 外壳 */
cp(path.join(ROOT, 'index.html'), path.join(DIST, 'index.html'));
/* SEO/托管基础件：robots / sitemap / 404 / LICENSE（问题 18/19） */
['robots.txt', 'sitemap.xml', '404.html', 'LICENSE'].forEach((f) => {
  const src = path.join(ROOT, f);
  if (fs.existsSync(src)) cp(src, path.join(DIST, f));
});
/* 静态包无后端：注入 RLWJ_API=false，前端跳过 api/meta 探测（消除每次启动的必现 404） */
{
  const f = path.join(DIST, 'index.html');
  let h = fs.readFileSync(f, 'utf8');
  h = h.replace('</head>', '  <script>window.RLWJ_API = false;</script></head>');
  fs.writeFileSync(f, h);
}

/* 2. css / js */
for (const dir of ['css', 'js']) {
  for (const f of fs.readdirSync(path.join(ROOT, dir))) {
    if (f.endsWith('.js') || f.endsWith('.css')) cp(path.join(ROOT, dir, f), path.join(DIST, dir, f));
  }
}

/* 3. data：只取 .js（分片/清单/类目/品牌别名 + gen/ 扩充分片），跳过 bulk jsonl 与缓存 */
for (const f of fs.readdirSync(path.join(ROOT, 'data'))) {
  if (f.endsWith('.js')) cp(path.join(ROOT, 'data', f), path.join(DIST, 'data', f));
}
const GEN = path.join(ROOT, 'data', 'gen');
if (fs.existsSync(GEN)) {
  for (const f of fs.readdirSync(GEN)) {
    if (f.endsWith('.js')) cp(path.join(GEN, f), path.join(DIST, 'data', 'gen', f));
  }
}

/* 4. enrich 媒体分片（图集+测评，排除下划线缓存） */
const ENRICH = path.join(ROOT, 'data', 'enrich');
for (const f of fs.readdirSync(ENRICH)) {
  if (f.endsWith('.js') && !f.startsWith('_')) cp(path.join(ENRICH, f), path.join(DIST, 'data', 'enrich', f));
}

/* 5. 部署说明 */
fs.writeFileSync(path.join(DIST, '.nojekyll'), ''); /* GitHub Pages 兼容（Gitee 无害） */
if (fs.existsSync(path.join(ROOT, 'dist-README.md'))) {
  cp(path.join(ROOT, 'dist-README.md'), path.join(DIST, 'README.md')); /* Gitee 仓库首页说明 */
}

/* 6. 仓库承诺物（问题 19/44）：LICENSE 已在上面拷贝，这里补 tools/、DEPLOY.md、CHANGELOG.md、CI */
['DEPLOY.md', 'CHANGELOG.md'].forEach((f) => {
  const src = path.join(ROOT, f);
  if (fs.existsSync(src)) cp(src, path.join(DIST, f));
});
const TOOLS = path.join(ROOT, 'tools');
for (const f of fs.readdirSync(TOOLS)) {
  if (f.endsWith('.js')) cp(path.join(TOOLS, f), path.join(DIST, 'tools', f));
}
const WF = path.join(ROOT, '.github', 'workflows');
if (fs.existsSync(WF)) {
  for (const f of fs.readdirSync(WF)) cp(path.join(WF, f), path.join(DIST, '.github', 'workflows', f));
}
/* 7. SEO 预渲染（问题 18/46）：dist/p/<id>.html + sitemap 重写 + feed.xml */
require('child_process').spawnSync(process.execPath, [path.join(TOOLS, 'prerender.js')], { stdio: 'inherit' });

/* 统计 */
let files = 0, bytes = 0;
(function walk(p) {
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    const c = path.join(p, e.name);
    if (e.isDirectory()) walk(c);
    else { files++; bytes += fs.statSync(c).size; }
  }
})(DIST);
console.log('dist/ 构建完成：' + files + ' 个文件 / ' + (bytes / 1048576).toFixed(2) + ' MB');
console.log('部署：把 dist/ 内容推到 Gitee 仓库并开启 Gitee Pages（详见 DEPLOY.md 路线 C）');
