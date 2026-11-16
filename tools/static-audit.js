/* static-audit.js — 静态托管就绪度审计：绝对路径 / 体积 / 分片格式 */
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..');
const issues = [];
const ok = [];

/* 1. 绝对路径检查（Gitee Pages 部署在 /repo/ 子路径下，/ 开头的资源路径全断） */
const jsFiles = fs.readdirSync(path.join(R, 'js')).filter((f) => f.endsWith('.js')).map((f) => 'js/' + f);
for (const f of ['index.html'].concat(jsFiles)) {
  const src = fs.readFileSync(path.join(R, f), 'utf8');
  const abs = [];
  for (const m of src.matchAll(/(?:src|href)="(\/[^"]*)"|fetch\('(\/[^']*)'/g)) abs.push(m[1] || m[2]);
  if (abs.length) issues.push(f + ' 含绝对路径: ' + abs.join(', '));
  else ok.push(f + ' 无绝对资源路径');
}

/* 2. /api 探测失败必须回退静态模式 */
const app = jsFiles.map((f) => fs.readFileSync(path.join(R, f), 'utf8')).join('\n');
ok.push('boot 探测→静态回退: ' + (/api\/meta/.test(app) && /loadStatic/.test(app)));

/* 3. 体积 */
const size = (p) => { try { const s = fs.statSync(p); return s.isFile() ? s.size : 0; } catch (e) { return 0; } };
let jsTotal = 0, n = 0;
for (const f of fs.readdirSync(path.join(R, 'data'))) if (f.endsWith('.js')) { jsTotal += size(path.join(R, 'data', f)); n++; }
let mediaTotal = 0, mn = 0;
for (const f of fs.readdirSync(path.join(R, 'data', 'enrich'))) if (f.endsWith('.js')) { mediaTotal += size(path.join(R, 'data', 'enrich', f)); mn++; }
ok.push('data/*.js ' + n + ' 个 ' + (jsTotal / 1048576).toFixed(2) + ' MB | enrich/*.js ' + mn + ' 个 ' + (mediaTotal / 1048576).toFixed(2) + ' MB');

/* 4. manifest 覆盖面 */
const w = {};
new Function('window', fs.readFileSync(path.join(R, 'data', 'manifest.js'), 'utf8'))(w);
const MAN = w.DB_MANIFEST;
const files = (MAN.shards || []).map((s) => s.file)
  .concat((MAN.bulk || []).map((s) => s.file))
  .concat(MAN.index ? [MAN.index] : []);
const loose = fs.readdirSync(path.join(R, 'data')).filter((f) => f.endsWith('.js') && !['manifest.js', 'categories.js', 'brand-alias.js', 'enrich-local.js'].includes(f));
const uncovered = loose.filter((f) => !files.includes('data/' + f));
if (uncovered.length) issues.push('manifest 未收录: ' + uncovered.join(', '));
else ok.push('manifest 覆盖全部 ' + files.length + ' 个数据条目（精选+bulk+索引）');

/* 5. index.html DOM 断言（N7）：转义引号 / 单 footer / skip-link / aria */
const html = fs.readFileSync(path.join(R, 'index.html'), 'utf8');
if (html.includes('\\"')) issues.push('index.html 含字面转义引号 \\"');
else ok.push('index.html 无字面转义引号');
const footers = (html.match(/<footer[\s>]/g) || []).length;
if (footers !== 1) issues.push('index.html footer 数量=' + footers + '（应为 1）');
else ok.push('index.html 单一 footer');
if (!/class="skip-link"/.test(html)) issues.push('index.html 缺少 skip-link');
else ok.push('index.html 含 skip-link');
if (!/aria-expanded="false"/.test(html) || !/aria-controls="main-nav"/.test(html)) issues.push('index.html menu-toggle 缺 aria-expanded/aria-controls');
else ok.push('menu-toggle aria 完整');

/* 6. index 轻索引与 gen 分片交叉校验（N7） */
const w2 = {};
new Function('window', fs.readFileSync(path.join(R, 'data', 'index.js'), 'utf8'))(w2);
const IDX = w2.DB_BULK_INDEX || [];
let genCount = 0;
const genDir = path.join(R, 'data', 'gen');
for (const f of fs.readdirSync(genDir).filter((x) => /^bulk-.*\.js$/.test(x))) {
  const w3 = {};
  new Function('window', fs.readFileSync(path.join(genDir, f), 'utf8'))(w3);
  for (const c of (w3.DB_CHUNKS || [])) genCount += (c.products || []).length;
}
if (IDX.length !== genCount) issues.push('index.js 轻索引 ' + IDX.length + ' 条 ≠ gen 分片 ' + genCount + ' 条');
else ok.push('index 轻索引与 gen 分片交叉一致（' + IDX.length + ' 条）');

console.log('════ 静态托管审计 ════');
ok.forEach((x) => console.log('  ✓ ' + x));
if (issues.length) { console.log('—— 问题 ——'); issues.forEach((x) => console.log('  ✗ ' + x)); process.exitCode = 1; }
else console.log('全部通过');
