/* js/router.js — 路由：hash 解析与链接构造（app.js 拆分模块 4/7）
   加载序：util → data → state → router → components → pages → app */
'use strict';

/* ================= 路由 ================= */

function currentRoute() {
  const raw = (location.hash || '').replace(/^#/, '') || '/';
  const idx = raw.indexOf('?');
  const path = idx === -1 ? raw : raw.slice(0, idx);
  const qs = idx === -1 ? '' : raw.slice(idx + 1);
  return {
    parts: path.split('/').filter(Boolean),
    query: new URLSearchParams(qs)
  };
}

function hrefWith(patch) {
  const r = currentRoute();
  const q = new URLSearchParams(r.query.toString());
  Object.keys(patch).forEach((k) => {
    const v = patch[k];
    if (v === '' || v == null) q.delete(k); else q.set(k, v);
  });
  const qs = q.toString();
  return '#/' + r.parts.join('/') + (qs ? '?' + qs : '');
}

