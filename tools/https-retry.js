/* https-retry.js — 对 https 升级失败的 31 条用 GET 重试（部分 CDN 禁 HEAD 但 GET 正常）
   成功则升级；仍失败则尝试去 _e1080 尺寸后缀变体；全部失败保留原样 */
const fs = require('fs');
const path = require('path');
const CACHE = path.join(__dirname, '..', 'data', 'enrich', '_galcache.json');
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' };

async function getImg(url) {
  try {
    const r = await fetch(url, { headers: { ...UA, Range: 'bytes=0-256' }, redirect: 'follow' });
    return (r.status === 200 || r.status === 206) && (r.headers.get('content-type') || '').toLowerCase().startsWith('image/');
  } catch (e) { return false; }
}

(async () => {
  const gal = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
  let up = 0, keep = 0;
  for (const id of Object.keys(gal)) {
    const out = [];
    for (const u of gal[id]) {
      if (!u.startsWith('http://')) { out.push(u); continue; }
      const https = u.replace(/^http:\/\//, 'https://');
      const noSuffix = https.replace(/_e\d+(\.\w+)$/, '$1'); /* 去尺寸后缀变体 */
      let done = null;
      if (await getImg(https)) done = https;
      else if (noSuffix !== https && await getImg(noSuffix)) done = noSuffix;
      if (done) { out.push(done); up++; } else { out.push(u); keep++; }
    }
    gal[id] = out;
  }
  fs.writeFileSync(CACHE, JSON.stringify(gal));
  console.log('GET 重试：' + up + ' 条升 https，' + keep + ' 条保留 http');
})();
