/* static-audit.js — 静态托管就绪度审计：绝对路径 / 体积 / 分片格式 */
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..');
const issues = [];
const ok = [];

/* 1. 绝对路径检查（Gitee Pages 部署在 /repo/ 子路径下，/ 开头的资源路径全断） */
for (const f of ['index.html', 'js/app.js']) {
  const src = fs.readFileSync(path.join(R, f), 'utf8');
  const abs = [];
  for (const m of src.matchAll(/(?:src|href)="(\/[^"]*)"|fetch\('(\/[^']*)'/g)) abs.push(m[1] || m[2]);
  if (abs.length) issues.push(f + ' 含绝对路径: ' + abs.join(', '));
  else ok.push(f + ' 无绝对资源路径');
}

/* 2. /api 探测失败必须回退静态模式 */
const app = fs.readFileSync(path.join(R, 'js/app.js'), 'utf8');
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
const files = (w.DB_MANIFEST.shards || []).map((s) => s.file);
const loose = fs.readdirSync(path.join(R, 'data')).filter((f) => f.endsWith('.js') && !['manifest.js', 'categories.js', 'brand-alias.js'].includes(f));
const uncovered = loose.filter((f) => !files.includes('data/' + f));
if (uncovered.length) issues.push('manifest 未收录: ' + uncovered.join(', '));
else ok.push('manifest 覆盖全部 ' + files.length + ' 个数据分片');

console.log('════ 静态托管审计 ════');
ok.forEach((x) => console.log('  ✓ ' + x));
if (issues.length) { console.log('—— 问题 ——'); issues.forEach((x) => console.log('  ✗ ' + x)); process.exitCode = 1; }
else console.log('全部通过');
