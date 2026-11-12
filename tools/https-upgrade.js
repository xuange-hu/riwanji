/* https-upgrade.js — 图源 http:// → https:// 升级（https 部署时混合内容会被浏览器拦截）
   逐条验证 https 变体可达且为 image/*，验证失败的保留原样（宁可 http 也不破图） */
const fs = require('fs');
const path = require('path');
const CACHE = path.join(__dirname, '..', 'data', 'enrich', '_galcache.json');
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' };

async function verifyImg(url) {
  try {
    const r = await fetch(url, { method: 'HEAD', headers: UA, redirect: 'follow' });
    return r.status === 200 && (r.headers.get('content-type') || '').toLowerCase().startsWith('image/');
  } catch (e) { return false; }
}

(async () => {
  const gal = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
  const jobs = [];
  for (const id of Object.keys(gal)) {
    gal[id] = gal[id].map((u) => {
      if (!u.startsWith('http://')) return Promise.resolve(u);
      const https = u.replace(/^http:\/\//, 'https://');
      return (async () => ((await verifyImg(https)) ? https : u))();
    });
  }
  /* 等待全部（每产品 ≤6 图，总量可控） */
  const flat = [];
  for (const id of Object.keys(gal)) for (const p of gal[id]) flat.push(p);
  const resolved = await Promise.all(flat);
  let i = 0;
  let up = 0, keep = 0;
  for (const id of Object.keys(gal)) {
    gal[id] = gal[id].map(() => {
      const v = resolved[i++];
      if (v.startsWith('https://')) up++; else keep++;
      return v;
    });
  }
  fs.writeFileSync(CACHE, JSON.stringify(gal));
  console.log('https 升级：' + up + ' 条成功，' + keep + ' 条保留 http（https 验证未通过）');
})();
