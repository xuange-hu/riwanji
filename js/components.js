/* js/components.js — 组件与产品图：卡片 / 图集 / 海报兜底 / 分页（app.js 拆分模块 5/7）
   加载序：util → data → state → router → components → pages → app */
'use strict';

/* ================= 组件 ================= */

function catIconOf(p) {
  const cats = DATA.online ? (DATA.meta ? DATA.meta.categories : []) : DATA.cats;
  const hit = (cats || []).filter((c) => c.id === p.category)[0];
  return (hit && hit.icon) || '📦';
}

/* leaf id（如 sensor-th-zigbee）→ 可读名称 */
function leafNameOf(leafId, cats) {
  const tree = window.DB_CATEGORY_TREE;
  if (tree && tree.leafById && tree.leafById[leafId]) return tree.leafById[leafId].name;
  /* 回退：找 id 前缀最长的品类（base id 可能带连字符，如 pc-case） */
  let best = null;
  (cats || []).forEach((c) => {
    if (leafId === c.id || leafId.indexOf(c.id + '-') === 0) {
      if (!best || c.id.length > best.id.length) best = c;
    }
  });
  return best ? best.name + ' · ' + leafId : leafId;
}

/* ================= 产品图（真实图 / 海报兜底） ================= */

/* 海报 SVG data-URI（静态模式兜底） */
function posterURI(p, variant) {
  const name = String(p.name || '');
  const brand = String(p.brand || '');
  let h = 0;
  const id = String(p.id || name) + '#' + (variant || 0);
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const v = variant || 0;
  const hue1 = (h + v * 97) % 360, hue2 = (hue1 + 42 + v * 13) % 360;
  const nameSize = name.length > 18 ? 40 : (name.length > 12 ? 50 : 60);
  const esc2 = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  /* 三种视觉变体：0=正面主视 1=参数视 2=侧视，各自构图/配色不同 */
  const angles = [0, 1, 2];
  const a = angles[v % 3];
  const geo = a === 0
    ? '<rect width="800" height="800" fill="url(#g)"/><circle cx="640" cy="220" r="200" fill="hsla(' + hue2 + ',60%,60%,0.12)"/>'
    : a === 1
      ? '<rect width="800" height="800" fill="url(#g)"/>' + [0, 1, 2, 3].map((i) => '<rect x="72" y="' + (360 + i * 70) + '" width="' + (300 + (i % 2) * 180) + '" height="16" rx="8" fill="hsla(' + hue2 + ',60%,80%,0.22)"/>').join('')
      : '<rect width="800" height="800" fill="url(#g)"/><rect x="72" y="360" width="656" height="220" rx="18" fill="hsla(' + hue2 + ',55%,70%,0.12)"/>';
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">' +
    '<defs><linearGradient id="g" x1="' + (a === 2 ? 1 : 0) + '" y1="0" x2="' + (a === 0 ? 1 : 0) + '" y2="1">' +
    '<stop offset="0%" stop-color="hsl(' + hue1 + ',58%,22%)"/>' +
    '<stop offset="55%" stop-color="hsl(' + hue2 + ',62%,30%)"/>' +
    '<stop offset="100%" stop-color="hsl(' + hue1 + ',55%,14%)"/></linearGradient></defs>' + geo +
    '<text x="72" y="200" font-family="sans-serif" font-size="34" fill="hsla(' + hue2 + ',70%,82%,0.9)">' + esc2(brand) + '</text>' +
    '<text x="72" y="300" font-family="sans-serif" font-size="' + nameSize + '" font-weight="700" fill="#fff">' + esc2(name.slice(0, 22)) + '</text>' +
    '<text x="72" y="720" font-family="sans-serif" font-size="30" fill="hsla(' + hue1 + ',60%,85%,0.75)">' + esc2(p.categoryName || '') + ' · ' + esc2(p.year || '') + '</text></svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/* 产品图集：每款产品至少 3 张 —— 真实图片优先，不足用海报变体补足 */
function galleryOf(p) {
  const id = String(p.id);
  const real = [];
  if (Array.isArray(p.images) && p.images.length) real.push(...p.images.filter(Boolean));
  if (p.image && real.indexOf(p.image) === -1) real.unshift(p.image);
  if (real.length >= 3) return real.slice(0, 6);
  const fill = [];
  for (let v = 0; fill.length < 3; v++) {
    const u = posterURI(p, v);
    if (real.indexOf(u) === -1 && fill.indexOf(u) === -1) fill.push(u);
  }
  return real.concat(fill).slice(0, 6);
}

/* 产品图：优先真实图片，其次 API 海报，静态模式本地海报；加载失败自动回退海报 */
const POSTER_CACHE = {};
const IMG_REGISTRY = {};
function posterOf(p) {
  const id = String(p.id);
  if (!POSTER_CACHE[id]) POSTER_CACHE[id] = posterURI(p);
  return POSTER_CACHE[id];
}
function productImg(p, alt) {
  let src;
  if (p.image) src = p.image;
  else if (DATA.online) src = 'api/image/' + encodeURIComponent(p.id);
  else src = posterURI(p);
  IMG_REGISTRY[String(p.id)] = p;
  return '<img loading="lazy" width="640" height="480" src="' + esc(src) + '" alt="' + esc(alt || p.name) + '" ' +
    'onerror="window.__rlwjDiag&&window.__rlwjDiag.imgFail++;window.__imgFail&&window.__imgFail(this)" data-pid="' + esc(String(p.id)) + '" />';
}

/* 产品图集渲染：主图 + 缩略图条（≥3 张），点击切换主图 */
function productGallery(p) {
  const imgs = galleryOf(p);
  IMG_REGISTRY[String(p.id)] = p;
  return '<div class="gallery" data-pid="' + esc(String(p.id)) + '">' +
    '<div class="gallery-main">' +
      '<img id="gallery-main-img" loading="lazy" width="640" height="480" src="' + esc(imgs[0]) + '" alt="' + esc(p.name) + '" ' +
      'onerror="window.__rlwjDiag&&window.__rlwjDiag.imgFail++;window.__imgFail&&window.__imgFail(this)" data-pid="' + esc(String(p.id)) + '" />' +
      '<span class="gallery-count">' + imgs.length + ' 图</span>' +
    '</div>' +
    '<div class="gallery-thumbs">' +
      imgs.map((src, i) =>
        '<img class="gallery-thumb' + (i === 0 ? ' active' : '') + '" loading="lazy" width="144" height="144" src="' + esc(src) + '" ' +
        'role="button" tabindex="0" aria-label="查看第 ' + (i + 1) + ' 张图" ' +
        'data-action="gallery-thumb" data-src="' + esc(src) + '" alt="' + esc(p.name) + ' 图' + (i + 1) + '" ' +
        'onerror="window.__rlwjDiag&&window.__rlwjDiag.imgFail++;window.__imgFail&&window.__imgFail(this)" data-pid="' + esc(String(p.id)) + '" />').join('') +
    '</div>' +
  '</div>';
}
let HL = [];
function hlText(text) {
  const escStr = esc(text);
  /* 实体保护：高亮词若命中 &amp; / &#39; 等实体内部，会破坏实体显示；
     按实体分段，只在实体外的片段做高亮 */
  const segs = escStr.split(/(&[a-z]+;|&#\d+;)/i);
  HL.forEach((t) => {
    if (!t) return;
    const re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    for (let i = 0; i < segs.length; i += 2) segs[i] = segs[i].replace(re, '<mark class="hl">$1</mark>');
  });
  return segs.join('');
}

function productCard(p) {
  const favOn = isFav(p.id) ? ' on' : '';
  const cmpOn = inCompare(p.id) ? ' on' : '';
  const scoreChips = (p.scores || []).slice(0, 3)
    .map((s) => '<span class="badge">' + esc(s[0]) + ' ' + esc(s[1]) + '</span>').join('');
  const demo = p.source === 'bulk' ? '<span class="badge" style="margin-left:6px;font-size:10px;padding:1px 7px">演示</span>' : '';
  return '' +
    /* N13：卡片不再 role=link+tabindex（内嵌按钮的嵌套交互被禁），
       整卡 data-link 保留点击任意处跳转，键盘用户走标题真实链接 */
    '<div class="card product-card" data-link="#/product/' + esc(p.id) + '">' +
      '<div class="pc-cover">' +
        productImg(p, p.name) +
        '<div class="pc-year">' + esc(p.year) + '</div>' +
      '</div>' +
      '<div class="pc-body">' +
        '<h3 class="pc-name"><a class="pc-link" href="#/product/' + esc(p.id) + '">' + hlText(p.name) + '</a></h3>' +
        '<div class="pc-brand">' + hlText(p.brand) + demo + '</div>' +
        '<div class="pc-summary">' + esc(p.summary) + '</div>' +
        '<div class="pc-scores">' + scoreChips + '</div>' +
        '<div class="pc-foot">' +
          '<span class="pc-score"><b>' + fmtScore(p.score) + '</b><span>/10 编辑</span></span>' +
          '<span class="actions">' +
            '<button class="icon-btn' + favOn + '" data-action="fav" data-id="' + esc(p.id) + '" title="收藏">♥</button>' +
            '<button class="icon-btn' + cmpOn + '" data-action="cmp" data-id="' + esc(p.id) + '" title="加入对比">⇋</button>' +
          '</span>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function productGrid(list, cls) {
  return '<div class="grid ' + (cls || 'grid-4') + '">' + (list || []).map(productCard).join('') + '</div>';
}

function scoreBars(scores) {
  return '<div class="score-bars">' + (scores || []).map((s) =>
    '<div class="score-row">' +
      '<div class="sb-label">' + esc(s[0]) + '</div>' +
      '<div class="sb-track"><div class="sb-fill" style="width:' + clamp(Number(s[1]) || 0, 0, 100) + '%"></div></div>' +
      '<div class="sb-val">' + esc(s[1]) + '</div>' +
    '</div>').join('') + '</div>';
}

function sectionHead(title, sub, moreHref, moreText) {
  return '<div class="section-head"><h2>' + esc(title) + '</h2>' +
    (sub ? '<span class="sub">' + esc(sub) + '</span>' : '') +
    (moreHref ? '<a class="more" href="' + moreHref + '">' + esc(moreText || '查看全部 →') + '</a>' : '') +
    '</div>';
}

function pagination(page, pages) {
  if (pages <= 1) return '';
  const btn = (label, p, disabled, cls) =>
    '<button class="btn btn-sm ' + (cls || 'btn-ghost') + '" data-action="page" data-page="' + p + '"' +
    (disabled ? ' disabled style="opacity:.45"' : '') + '>' + label + '</button>';
  /* 页码窗口 + 跳页（问题 26）：首尾 + 当前 ±2 + 省略号 */
  const nums = [];
  const push = (n) => { if (n >= 1 && n <= pages && nums.indexOf(n) === -1) nums.push(n); };
  push(1); push(2);
  for (let n = page - 2; n <= page + 2; n++) push(n);
  push(pages - 1); push(pages);
  nums.sort((a, b) => a - b);
  let out = '';
  let prev = 0;
  nums.forEach((n) => {
    if (n - prev > 1) out += '<span class="muted" style="font-size:12px;padding:0 3px">…</span>';
    out += (n === page)
      ? '<button class="btn btn-sm btn-primary" disabled>' + n + '</button>'
      : btn(String(n), n, false);
    prev = n;
  });
  return '<div class="pagination">' +
    btn('« 上一页', page - 1, page <= 1) + out +
    btn('下一页 »', page + 1, page >= pages) +
    '<span class="muted" style="font-size:13px">第 ' + page + ' / ' + pages + ' 页</span>' +
    '<input id="page-goto" type="number" min="1" max="' + pages + '" placeholder="跳页" ' +
      'aria-label="跳到指定页" style="width:64px;height:30px;border-radius:8px;border:1px solid var(--border-strong);background:var(--card);color:var(--text);padding:0 8px;font-size:12.5px" />' +
    '</div>';
}

