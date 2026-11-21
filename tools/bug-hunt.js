/* bug-hunt.js — 边缘用例全量实测，暴露小 bug */
(async () => {
  /* P2-36：端口可配（CI 通过 BUG_HUNT_PORT 指定），默认 8123 */
  const B = 'http://127.0.0.1:' + (process.env.BUG_HUNT_PORT || 8123);
  const g = async (u) => {
    try {
      const r = await fetch(B + u);
      return { status: r.status, ct: r.headers.get('content-type') || '', json: await r.json().catch(() => null) };
    } catch (e) { return { status: 0, error: e.message, json: null }; }
  };
  const issues = [];
  const ok = [];
  const check = (name, cond, detail) => (cond ? ok.push(name) : issues.push(name + ' → ' + detail));

  /* P2-36：动态取一个真实产品 id 作图片变体样本，避免硬编码 id 随数据更新失效 */
  const home0 = await g('/api/home');
  let sampleId = (((home0.json || {}).editors) || []).find((x) => x && x.id);
  if (!sampleId) {
    const s0 = await g('/api/search?pageSize=5');
    sampleId = (((s0.json || {}).items) || []).find((x) => x && x.id);
  }
  sampleId = sampleId ? sampleId.id : '';

  /* 1. 空查询/特殊字符搜索 */
  let r = await g('/api/search?q=');
  check('空搜索', r.status === 200 && Array.isArray((r.json || {}).items), 'status=' + r.status);
  r = await g('/api/search?q=' + encodeURIComponent('<script>alert(1)</script>'));
  check('XSS 查询不崩', r.status === 200, 'status=' + r.status);
  const xssItem = ((r.json || {}).items || [])[0];
  /* 问题 61：无结果不等于已转义，如实分开标注 */
  if (!xssItem) ok.push('XSS 查询无回显（空结果）');
  else if (/<script>/.test(xssItem.name)) issues.push('XSS 查询回显未转义');
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
  check('路径穿越 id 不泄露', r.status === 404, 'status=' + r.status); /* 问题 61：200 不可接受 */

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

  /* 8. 图片接口（P2-36：样本 id 改为动态获取，不再硬编码 b-phone-0008702） */
  r = await g('/api/image/不存在');
  check('image 不存在 404', r.status === 404, 'status=' + r.status);
  if (sampleId) {
    r = await g('/api/image/' + encodeURIComponent(sampleId) + '?v=99');
    check('v=99 变体不崩', r.status === 200, 'status=' + r.status);
    r = await g('/api/image/' + encodeURIComponent(sampleId) + '?v=-3');
    check('v=-3 变体不崩', r.status === 200, 'status=' + r.status);
  } else ok.push('image 变体样本跳过（API 无可用产品 id）');

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
    process.exitCode = 1; /* 问题 61：发现问题必须以非零码退出，CI 才拦得住 */
  } else console.log('\n全部通过，无问题');
})();
