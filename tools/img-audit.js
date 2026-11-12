/* 图片来源审计：统计精选产品中图片 host 分布与缺失量 */
const fs = require('fs');
const path = require('path');
const DATA = path.join(__dirname, '..', 'data');
const skip = new Set(['categories.js', 'brand-alias.js', 'manifest.js']);
const files = fs.readdirSync(DATA).filter((f) => f.endsWith('.js') && !skip.has(f));
const hosts = {};
let total = 0, hasImg = 0, hasMedia = 0;
const missing = [];
for (const f of files) {
  const code = fs.readFileSync(path.join(DATA, f), 'utf8');
  let window = {};
  try {
    new Function('window', 'module', code)(window, {});
  } catch (e) { console.warn('跳过 ' + f + '：' + e.message); continue; }
  const chunkArr = window.DB_CHUNKS || [];
  const flat = [];
  for (const ch of chunkArr) {
    const arr = (ch && (ch.products || ch.items)) || (Array.isArray(ch) ? ch : null);
    if (arr) flat.push(...arr);
    else if (ch && ch.id) flat.push(ch);
  }
  for (const p of flat) {
    if (!p || !p.id) continue;
    total++;
    if (p.image) {
      hasImg++;
      const m = String(p.image).match(/^https?:\/\/([^/]+)/);
      if (m) hosts[m[1]] = (hosts[m[1]] || 0) + 1;
    } else missing.push(f + ' → ' + p.id + ' (' + (p.year || '?') + ')');
    if (p.media && p.media.length) hasMedia++;
  }
}
console.log('精选产品 ' + total + ' 个，有图片 ' + hasImg + '，缺图片 ' + (total - hasImg) + '，含测评索引 ' + hasMedia);
console.log('host 分布：', JSON.stringify(hosts, null, 1));
console.log('缺图片清单（前 40）：');
missing.slice(0, 40).forEach((x) => console.log('  ' + x));
