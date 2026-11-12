/* backfill.js — 为图集不足3图的疑难产品补图（放宽同源限制 + 多查询） */
const fs = require('fs');
const path = require('path');
const ENRICH = path.join(__dirname, '..', 'data', 'enrich');
const CACHE = path.join(ENRICH, '_galcache.json');
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' };
const TARGETS = {
  'mijia-smart-plug-3': ['小米 米家智能插座3 产品图', '米家智能插座 3 图片', '小米智能插座 3', 'Xiaomi Mi Smart Plug 3'],
  'synology-ds923-plus': ['群晖 DS923+ NAS 产品图', 'Synology DS923+ 图片', '群晖 DS923 产品图', 'Synology DiskStation DS923+']
};
async function verifyImg(url) {
  if (!/^https?:\/\//.test(url)) return false;
  try {
    let r = await fetch(url, { method: 'HEAD', headers: UA, redirect: 'follow' });
    let ct = (r.headers.get('content-type') || '').toLowerCase();
    let cl = Number(r.headers.get('content-length') || 0);
    if (r.status === 200 && ct.startsWith('image/') && (!cl || (cl > 2500 && cl < 9e6))) return true;
    r = await fetch(url, { headers: { ...UA, Range: 'bytes=0-2047' }, redirect: 'follow' });
    return r.status === 200 && (r.headers.get('content-type') || '').toLowerCase().startsWith('image/');
  } catch (e) { return false; }
}
function parse(h) {
  const u = [];
  for (const m of h.matchAll(/"objURL":"(https?:\/\/[^"]+)"/g)) u.push(m[1].replace(/\\\//g, '/'));
  for (const m of h.matchAll(/"thumbURL":"(https?:\/\/[^"]+)"/g)) u.push(m[1].replace(/\\\//g, '/'));
  for (const m of h.matchAll(/murl&quot;:&quot;(https?:\/\/[^&]+?)&quot;/g)) u.push(m[1]);
  for (const m of h.matchAll(/"murl":"(https?:\/\/[^"]+)"/g)) u.push(m[1]);
  return u;
}
async function text(url, extra) {
  try { const c = new AbortController(); const t = setTimeout(() => c.abort(), 9000); const r = await fetch(url, { headers: { ...UA, ...(extra || {}) }, signal: c.signal }); const b = await r.text(); clearTimeout(t); return r.status === 200 ? b : ''; } catch (e) { return ''; }
}
(async () => {
  const cache = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
  for (const id of Object.keys(TARGETS)) {
    const got = (cache[id] || []).slice();
    for (const q of TARGETS[id]) {
      if (got.length >= 3) break;
      const bd = await text('https://image.baidu.com/search/acjson?tn=resultjson_com&word=' + encodeURIComponent(q) + '&pn=0&rn=20', { Referer: 'https://image.baidu.com/' });
      const bi = await text('https://cn.bing.com/images/async?q=' + encodeURIComponent(q) + '&first=0&count=20&adlt=off');
      for (const u of parse(bd).concat(parse(bi))) {
        if (got.length >= 3) break;
        if (got.indexOf(u) !== -1) continue;
        if (await verifyImg(u)) got.push(u);
      }
    }
    cache[id] = got.slice(0, 6);
    console.log(id, '→', cache[id].length, '图');
  }
  fs.writeFileSync(CACHE, JSON.stringify(cache));
  console.log('补图完成');
})();
