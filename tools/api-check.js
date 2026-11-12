/* 一次性线上 API 验证脚本 */
(async () => {
  const g = async (u) => { const r = await fetch('http://127.0.0.1:8123' + u); return r.json(); };
  const m = await g('/api/meta');
  console.log('meta: total=' + m.total.toLocaleString(), 'curated=' + m.curated, 'bulk=' + m.bulk.toLocaleString(),
    '大类=' + m.tree.groups, '品类=' + m.tree.bases, '细分=' + m.tree.leaves, '品牌=' + m.brands.length);

  let t = Date.now();
  const s = await g('/api/search?q=' + encodeURIComponent('Zigbee 人体传感器') + '&pageSize=3');
  console.log('search[Zigbee 人体传感器]: total=' + s.total.toLocaleString() + ' (' + (Date.now() - t) + 'ms)');
  s.items.forEach((p) => console.log('  -', p.name, '|', p.brand, '|', p.subcat, '| ¥' + p.price, '| 评分', p.score));

  t = Date.now();
  const s2 = await g('/api/search?cat=sensor&pageSize=1');
  console.log('search[cat=sensor]: total=' + s2.total.toLocaleString() + ' (' + (Date.now() - t) + 'ms)');

  const s3 = await g('/api/search?leaf=sensor-th-zigbee&pageSize=1');
  console.log('search[leaf=sensor-th-zigbee]: total=' + s3.total.toLocaleString());

  const s4 = await g('/api/search?q=sony&pageSize=1');
  console.log('search[sony]: total=' + s4.total.toLocaleString());

  const s5 = await g('/api/search?q=' + encodeURIComponent('显卡 RTX') + '&pageSize=2');
  console.log('search[显卡 RTX]: total=' + s5.total.toLocaleString());

  t = Date.now();
  const p = await g('/api/product/' + s.items[0].id);
  console.log('详情载入(' + (Date.now() - t) + 'ms):', p.name, '| specs=' + p.specs.length + '行', '| pros=' + p.pros.length, '| review=' + (p.review ? 'ok' : '缺失'));

  const c = await g('/api/categories');
  console.log('categories: ' + c.groups.length + ' 大类, 例:', c.groups[0].name, '→', c.groups[0].bases[0].name,
    '(' + c.groups[0].bases[0].count + ' 款,', c.groups[0].bases[0].leaves.length, '细分)');

  const r = await g('/api/ranking?cat=gpu&pageSize=2');
  console.log('ranking[cat=gpu]: total=' + r.total.toLocaleString());

  const rl = await g('/api/related?id=' + s.items[0].id);
  console.log('related: ' + rl.items.length + ' 条');

  const su = await g('/api/suggest?q=esp32');
  console.log('suggest[esp32]: ' + su.items.length + ' 条');

  // 随机 20 条详情完整性抽查
  const big = await g('/api/search?pageSize=20&sort=new');
  let ok = 0, bad = 0;
  for (const it of big.items) {
    const full = await g('/api/product/' + it.id);
    if (full && full.specs && full.review && full.pros) ok++; else bad++;
  }
  console.log('随机详情抽查: ok=' + ok + ' bad=' + bad);
})();
