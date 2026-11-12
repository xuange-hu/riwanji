/* rebuild-media.js — 合并重建 media 分片
   数据源：
     _galcache.json   每产品≥3张验证图片 → image + images
     _revcache4.json  严格匹配的测评链接（如有）→ media
   输出：data/enrich/media-N.js（window.DB_MEDIA 合并式） */
const fs = require('fs');
const path = require('path');
const ENRICH = path.join(__dirname, '..', 'data', 'enrich');
const gal = JSON.parse(fs.readFileSync(path.join(ENRICH, '_galcache.json'), 'utf8'));
let rev = {};
try { rev = JSON.parse(fs.readFileSync(path.join(ENRICH, '_revcache4.json'), 'utf8')); } catch (e) { /* 测评可选 */ }

const ids = [...new Set([...Object.keys(gal).filter((k) => (gal[k] || []).length), ...Object.keys(rev).filter((k) => (rev[k] || []).length)])];
/* 测评链接去重：同页面不同写法（/ 与 /index.html）只留一条 */
const normUrl = (u) => String(u).replace(/\/index\.html?$/i, '/').replace(/\/+$/, '');
for (const k of Object.keys(rev)) {
  const seen = new Set();
  rev[k] = (rev[k] || []).filter((m) => { const n = normUrl(m.url); if (seen.has(n)) return false; seen.add(n); return true; });
}
const perShard = 40;
const shardCount = Math.max(1, Math.ceil(ids.length / perShard));
for (const f of fs.readdirSync(ENRICH)) if (/^media-\d+\.js$/.test(f)) fs.unlinkSync(path.join(ENRICH, f));
let three = 0, total = 0, revTotal = 0;
for (let s = 0; s < shardCount; s++) {
  const obj = {};
  for (const id of ids.slice(s * perShard, (s + 1) * perShard)) {
    const e = {};
    const imgs = (gal[id] || []).filter(Boolean);
    if (imgs.length) {
      total += imgs.length;
      if (imgs.length >= 3) three++;
      e.image = imgs[0];
      e.images = imgs;
    }
    if ((rev[id] || []).length) { e.media = rev[id]; revTotal += rev[id].length; }
    obj[id] = e;
  }
  fs.writeFileSync(path.join(ENRICH, 'media-' + (s + 1) + '.js'),
    '/* 图集 + 测评补充数据 ' + (s + 1) + '/' + shardCount + '（图片均经 HEAD/GET 验证；测评链接均经标题强匹配+可达验证） */\n' +
    'window.DB_MEDIA = Object.assign(window.DB_MEDIA || {}, ' + JSON.stringify(obj, null, 1) + ');\n');
}
console.log('重建完成：' + ids.length + ' 产品 | 图 ' + total + ' 张（≥3图 ' + three + '）| 测评链接 ' + revTotal + ' 条 → media-1..' + shardCount + '.js');
