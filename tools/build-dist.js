#!/usr/bin/env node
/* ============================================================
   tools/build-dist.js
   构建纯静态部署包 dist/（GitHub Pages / Gitee Pages 共用）：
     index.html / css / js / data/*.js（精选+gen 分片）/ data/enrich/media-*.js
   排除：data/bulk/*.jsonl（4.7GB 服务端专用）、缓存 json、node_modules、dist/.git
   用法：node tools/build-dist.js
        BUILD_PACK_TOOLS=0 node tools/build-dist.js   # 不把 tools/workflows/文档打进产物（GitHub Pages 更干净）

   P2-35 决策：默认仍复制 tools/*.js + .github/workflows + DEPLOY/CHANGELOG 进 dist，
   因为 Gitee 路线是整仓 push，且 dist 内四件套（validate/stats/smoke/static-audit）
   需在产物上再跑一遍；GitHub Pages 不需要这些文件，可用 BUILD_PACK_TOOLS=0 关闭。
   统计口径始终排除 .git/.github/tools（P2-34），避免体积虚高。

   P2-33 清理边界：按 root 源白名单对 dist 全树定向清理（只删文件，不动目录树）；
   保留 .git（真仓库）/ img（localize-images.js 生成的本地图库，root 无对应源）/
   p（prerender.js 自带孤儿清理）。
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const TOOLS = path.join(ROOT, 'tools');
const PACK_TOOLS = process.env.BUILD_PACK_TOOLS !== '0'; /* P2-35：默认保留，=0 关闭 */

/* P1-3①：与 tools/serve.js 的 CSP 保持一致。GitHub Pages / Gitee Pages 不读 _headers，
   该文件供 Nginx / Cloudflare 等承载层使用；Pages 侧靠 HTML meta CSP 兜底（主代理处理）。 */
const CSP = "default-src 'self'; img-src 'self' data:; style-src 'self'; style-src-attr 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests";

function cp(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });

/* 1. 外壳 */
cp(path.join(ROOT, 'index.html'), path.join(DIST, 'index.html'));
/* SEO/托管基础件：robots / sitemap / 404 / LICENSE（问题 18/19） */
['robots.txt', 'sitemap.xml', '404.html', 'LICENSE'].forEach((f) => {
  const src = path.join(ROOT, f);
  if (fs.existsSync(src)) cp(src, path.join(DIST, f));
});
/* 静态包无后端：注入 boot-config.js 引用（问题 2/76/79）——外联脚本设 RLWJ_API=false，
   前端跳过 api/meta 探测（消除每次启动的必现 404）；不用内联脚本，严格 CSP 友好 */
{
  const f = path.join(DIST, 'index.html');
  let h = fs.readFileSync(f, 'utf8');
  h = h.replace('</head>', '  <script src="js/boot-config.js"></script></head>');
  fs.writeFileSync(f, h);
}

/* 2. css / js */
for (const dir of ['css', 'js']) {
  for (const f of fs.readdirSync(path.join(ROOT, dir))) {
    if (f.endsWith('.js') || f.endsWith('.css')) cp(path.join(ROOT, dir, f), path.join(DIST, dir, f));
  }
}
/* 部署包的 boot-config.js 覆盖为静态模式开关（问题 2/76）
   P3-26：defineProperty 冻结，防止后续 data/*.js 脚本重设 window.RLWJ_API 破坏静态隔离。 */
fs.writeFileSync(path.join(DIST, 'js', 'boot-config.js'),
  '/* js/boot-config.js — 静态部署包启动开关（tools/build-dist.js 生成） */\n' +
  "Object.defineProperty(window, 'RLWJ_API', { value: false, writable: false, configurable: false, enumerable: true });\n");

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

/* 5. 托管安全头（P1-3①）：Pages 不识别 _headers，但 Nginx / Cloudflare 可用。
   保留在产物里也供运维直接取用；Pages 侧靠 index/404/p 页的 meta CSP 兜底。 */
fs.writeFileSync(path.join(DIST, '_headers'),
  '# 由 tools/build-dist.js 生成：供 Nginx / Cloudflare 等承载层读取\n' +
  '# GitHub Pages / Gitee Pages 不识别本文件，需在 HTML 中用 meta CSP 兜底\n' +
  '/*\n' +
  '  Content-Security-Policy: ' + CSP + '\n' +
  '  X-Frame-Options: DENY\n' +
  '  Referrer-Policy: strict-origin-when-cross-origin\n' +
  '  X-Content-Type-Options: nosniff\n' +
  '\n');

/* 6. 部署说明 + 仓库承诺物（P2-35：BUILD_PACK_TOOLS=0 时不打包） */
fs.writeFileSync(path.join(DIST, '.nojekyll'), ''); /* GitHub Pages 兼容（Gitee 无害） */
/* 图片元数据必须在组件脚本之前同步加载；构建时确保它进入静态包。 */
if (fs.existsSync(path.join(ROOT, 'dist-README.md'))) {
  cp(path.join(ROOT, 'dist-README.md'), path.join(DIST, 'README.md')); /* Gitee 仓库首页说明 */
}
if (PACK_TOOLS) {
  ['DEPLOY.md', 'CHANGELOG.md'].forEach((f) => {
    const src = path.join(ROOT, f);
    if (fs.existsSync(src)) cp(src, path.join(DIST, f));
  });
  for (const f of fs.readdirSync(TOOLS)) {
    if (f.endsWith('.js')) cp(path.join(TOOLS, f), path.join(DIST, 'tools', f));
  }
  const WF = path.join(ROOT, '.github', 'workflows');
  if (fs.existsSync(WF)) {
    for (const f of fs.readdirSync(WF)) cp(path.join(WF, f), path.join(DIST, '.github', 'workflows', f));
  }
}

/* 6b. P2-33：按 root 源白名单对 dist 全树定向清理（只删文件，不动目录树）。
   保留 .git（真仓库）/ img（本地图库，root 无源）/ p（prerender 自带清理）。 */
(function pruneDistTree() {
  const expected = new Set([
    'index.html', '404.html', 'sitemap.xml', 'feed.xml', 'robots.txt', 'LICENSE',
    '.nojekyll', '_headers', 'README.md', 'js/boot-config.js'
  ]);
  for (const dir of ['css', 'js']) {
    const d = path.join(ROOT, dir);
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) if (/\.(js|css)$/.test(f)) expected.add(dir + '/' + f);
  }
  for (const f of fs.readdirSync(path.join(ROOT, 'data'))) if (f.endsWith('.js')) expected.add('data/' + f);
  if (fs.existsSync(GEN)) for (const f of fs.readdirSync(GEN)) if (f.endsWith('.js')) expected.add('data/gen/' + f);
  if (fs.existsSync(ENRICH)) for (const f of fs.readdirSync(ENRICH)) if (f.endsWith('.js') && !f.startsWith('_')) expected.add('data/enrich/' + f);
  if (PACK_TOOLS) {
    for (const f of ['DEPLOY.md', 'CHANGELOG.md']) if (fs.existsSync(path.join(ROOT, f))) expected.add(f);
    for (const f of fs.readdirSync(TOOLS)) if (f.endsWith('.js')) expected.add('tools/' + f);
    const wf = path.join(ROOT, '.github', 'workflows');
    if (fs.existsSync(wf)) for (const f of fs.readdirSync(wf)) expected.add('.github/workflows/' + f);
  }
  const PRESERVE = new Set(['.git', 'img', 'p']);
  (function walk(dir, rel) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const r = rel ? rel + '/' + e.name : e.name;
      const c = path.join(dir, e.name);
      if (PRESERVE.has(r)) continue;
      if (e.isDirectory()) walk(c, r);
      else if (!expected.has(r)) {
        try { fs.unlinkSync(c); console.log('  清理孤儿: ' + r); } catch (_) { /* noop */ }
      }
    }
  })(DIST, '');
})();

/* 7. SEO 预渲染（问题 18/46）：dist/p/<id>.html + sitemap 重写 + feed.xml */
/* 预渲染失败必须中断构建（问题 59）：否则部署包带着残缺 p/ 页发布 */
const pr = require('child_process').spawnSync(process.execPath, [path.join(TOOLS, 'prerender.js')], { stdio: 'inherit' });
if (pr.status !== 0) {
  console.error('build-dist：prerender 失败（exit ' + pr.status + '），中止构建');
  process.exit(1);
}

/* 8. 统计（P2-34）：分列「产物」与「仓库元数据」，跳过 .git/.github/tools，避免体积虚高 */
const SKIP_DIRS = new Set(['.git', '.github', 'tools']);
let artFiles = 0, artBytes = 0, metaFiles = 0, metaBytes = 0;
function measure(p, isMeta) {
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    const c = path.join(p, e.name);
    if (e.isDirectory()) {
      if (!isMeta && SKIP_DIRS.has(e.name)) measure(c, true);
      else measure(c, isMeta);
    } else if (isMeta) { metaFiles++; metaBytes += fs.statSync(c).size; }
    else { artFiles++; artBytes += fs.statSync(c).size; }
  }
}
measure(DIST, false);
console.log('dist/ 构建完成：产物 ' + artFiles + ' 个文件 / ' + (artBytes / 1048576).toFixed(2) + ' MB' +
  '；仓库元数据(.git/.github/tools) ' + metaFiles + ' 个文件 / ' + (metaBytes / 1048576).toFixed(2) + ' MB（不计入产物体积）');
console.log('部署：把 dist/ 内容推到 Gitee 仓库并开启 Gitee Pages（详见 DEPLOY.md 路线 C）');
