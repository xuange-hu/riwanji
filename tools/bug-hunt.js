/* bug-hunt.js — 边缘用例全量实测，暴露小 bug */
(async () => {
  const B = 'http://127.0.0.1:8123';
  const g = async (u) => {
    try {
      const r = await fetch(B + u);
      return { status: r.status, ct: r.headers.get('content-type') || '', json: await r.json().catch(() => null) };
    } catch (e) { return { status: 0, error: e.message, json: null }; }
  };
  const issues = [];
  const ok = [];
  const check = (name, cond, detail) => (cond ? ok.push(name) : issues.push(name + ' → ' + detail));

  /* 1. 空查询/特殊字符搜索 */
  let r = await g('/api/search?q=');
  check('空搜索', r.status === 200 && Array.isArray((r.json || {}).items), 'status=' + r.status);
  r = await g('/api/search?q=' + encodeURIComponent('<script>alert(1)</script>'));
  check('XSS 查询不崩', r.status === 200, 'status=' + r.status);
  const xssItem = ((r.json || {}).items || [])[0];
  if (xssItem && /<script>/.test(xssItem.name)) issues.push('XSS 查询回显未转义');
  else ok.push('XSS 查询转义');

  r = await g('/api/search?q=' + encodeURIComponent('％％％'));
  check('全角乱码查询', r.status === 200, 'status=' + r.status);
  r = await g('/api/search?q=' + encodeURIComponent('"\\/*?[]{}'));
  check('符号查询', r.status === 200, 'status=' + r.status);

  /* 2. 产品 ID 边缘 */
  r = await g('/api/product/' + encodeURIComponent('不存在的id'));
  check('不存在产品 404', r.status === 404, 'status=' + r.status);
  r = await g('/api/product/' + encodeURIComponent("'; DROP TABLE--"));
  check('注入式 id 不崩', r.status === 200 || r.status === 404, 'status=' + r.status);
  r = await g('/api/product/' + encodeURIComponent('../etc/passwd'));
  check('路径穿越 id 不泄露', r.status === 404 || r.status === 200, 'status=' + r.status);

  /* 3. 分页边界 */
  r = await g('/api/search?q=a&page=0&pageSize=0');
  check('page=0 pageSize=0 不崩', r.status === 200, 'status=' + r.status);
  r = await g('/api/search?q=a&page=999999&pageSize=99999');
  check('超大分页不崩', r.status === 200, 'status=' + r.status);
  r = await g('/api/search?q=a&page=-5&pageSize=-1');
  check('负数分页不崩', r.status === 200, 'status=' + r.status);

  /* 4. suggest */
  r = await g('/api/suggest?q=');
  check('空 suggest', r.status === 200, 'status=' + r.status);
  r = await g('/api/suggest?q=x');
  check('单字符 suggest', r.status === 200, 'status=' + r.status);
  r = await g('/api/suggest?q=' + encodeURIComponent('  '));
  check('空白 suggest', r.status === 200, 'status=' + r.status);

  /* 5. 品牌 */
  r = await g('/api/brand/' + encodeURIComponent('不存在品牌'));
  check('不存在品牌 404', r.status === 404, 'status=' + r.status);
  r = await g('/api/brand/' + encodeURIComponent('%'));
  check('特殊字符品牌', r.status === 200 || r.status === 404, 'status=' + r.status);

  /* 6. products 批量 */
  r = await g('/api/products?ids=');
  check('空 ids', r.status === 200, 'status=' + r.status);
  r = await g('/api/products?ids=,,,');
  check('空洞 ids', r.status === 200 && (r.json.items || []).length === 0, 'got=' + (r.json && (r.json.items || []).length));
  const big = Array.from({ length: 60 }, (_, i) => 'x' + i).join(',');
  r = await g('/api/products?ids=' + big);
  check('60 个 id 限幅', r.status === 200, 'status=' + r.status);

  /* 7. ranking / timeline / related */
  r = await g('/api/ranking?cat=不存在&page=9999');
  check('ranking 空类', r.status === 200, 'status=' + r.status);
  r = await g('/api/related?id=不存在');
  check('related 空 id', r.status === 200 || r.status === 404, 'status=' + r.status);
  r = await g('/api/timeline?cat=xyz');
  check('timeline 空类', r.status === 200, 'status=' + r.status);

  /* 8. 图片接口 */
  r = await g('/api/image/不存在');
  check('image 不存在 404', r.status === 404, 'status=' + r.status);
  r = await g('/api/image/b-phone-0008702?v=99');
  check('v=99 变体不崩', r.status === 200, 'status=' + r.status);
  r = await g('/api/image/b-phone-0008702?v=-3');
  check('v=-3 变体不崩', r.status === 200, 'status=' + r.status);

  /* 9. 大小写/重复参数 */
  r = await g('/api/search?Q=Apple&q=');
  check('大小写参数', r.status === 200, 'status=' + r.status);

  /* 10. home */
  r = await g('/api/home');
  check('home', r.status === 200 && (r.json || {}).stats && (r.json || {}).stats.total > 0, 'status=' + r.status);

  console.log('════ 通过 ' + ok.length + ' 项 ════');
  ok.forEach((x) => console.log('  ✓ ' + x));
  if (issues.length) {
    console.log('\n════ 发现问题 ' + issues.length + ' 项 ════');
    issues.forEach((x) => console.log('  ✗ ' + x));
  } else console.log('\n全部通过，无问题');
})();
