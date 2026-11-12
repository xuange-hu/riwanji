(async () => {
  const id = 'b-phone-0008702';
  const sizes = [];
  for (const v of [0, 1, 2]) {
    const r = await fetch('http://127.0.0.1:8123/api/image/' + id + '?v=' + v);
    const t = await r.text();
    sizes.push(t.length);
    console.log('v=' + v, r.status, (r.headers.get('content-type') || '').slice(0, 20), t.length + 'B');
  }
  console.log('三张海报长度:', sizes.join(' / '), '| 变体不同:', new Set(sizes).size > 1 ? 'YES' : 'NO');
})();
