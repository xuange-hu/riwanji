/* edge-decode.js — 非法百分号编码 / 变体号 / 混合内容 探测 */
(async () => {
  const B = 'http://127.0.0.1:8123';
  /* 1. 非法编码 id（前端 decodeURIComponent 会抛 URIError？） */
  const bad = '%E0%A4%A'; /* 不完整 UTF-8 序列 */
  try {
    decodeURIComponent(bad);
    console.log('decodeURIComponent(非法) → 未抛错');
  } catch (e) {
    console.log('decodeURIComponent(非法) → 抛出', e.name, '← renderRoute 标题在 try 外，会白屏！');
  }
  /* 2. 图片变体负数 */
  const r = await fetch(B + '/api/image/b-phone-0008702?v=-3');
  const t = await r.text();
  const hsl = (t.match(/hsl\((-?\d+)/) || [])[1];
  console.log('v=-3 海报 hue:', hsl, Number(hsl) < 0 ? '← 负数色相（应规范化）' : 'OK');
  /* 3. 真实图 http 混合内容检查（https 部署会被拦） */
  const cache = JSON.parse(require('fs').readFileSync('data/enrich/_galcache.json', 'utf8'));
  const all = Object.values(cache).flat();
  const httpOnly = all.filter((u) => u.startsWith('http://'));
  console.log('图源 http:// 明文:', httpOnly.length, '/', all.length, httpOnly.length ? '← https 部署将被拦截' : 'OK');
  if (httpOnly.length) {
    const sample = httpOnly[0].replace('http://', 'https://');
    try {
      const rr = await fetch(sample, { method: 'HEAD' });
      console.log('https 升级测试:', rr.status, rr.headers.get('content-type'), '→', sample.slice(0, 60));
    } catch (e) { console.log('https 升级测试失败:', e.name); }
  }
})();
