/* js/state.js — 本地状态：收藏 / 对比 / 演示开关（localStorage）（app.js 拆分模块 3/7）
   加载序：util → data → state → router → components → pages → app */
'use strict';

/* ================= 本地状态 ================= */

const state = {
  favorites: store.get('favorites', []),
  compare: store.get('compare', []),
  reviews: store.get('reviews', {}),
  /* 默认跟随系统主题（问题 28）；手动切换后写 themeAuto=false 不再跟随 */
  theme: store.get('theme', (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark'),
  showDemo: store.get('showDemo', false), /* 演示（合成）数据默认隐藏 */
  tlOpen: new Set(),  /* 时间线年份展开态（瞬态） */
  cmpDiff: false      /* 对比「只看差异」开关（瞬态） */
};

function saveState() {
  store.set('favorites', state.favorites);
  store.set('compare', state.compare);
  store.set('reviews', state.reviews);
  store.set('showDemo', state.showDemo);
}

/* 演示数据治理：source=bulk 的合成样本默认不进任何决策入口，用户可显式开关 */
const isDemo = (p) => p && p.source === 'bulk';
const demoVisible = () => !!state.showDemo;
function visibleProducts() {
  return demoVisible() ? DATA.products : DATA.products.filter((p) => !isDemo(p));
}

const isFav = (id) => state.favorites.indexOf(id) !== -1;
const inCompare = (id) => state.compare.indexOf(id) !== -1;

function toggleFav(id) {
  const i = state.favorites.indexOf(id);
  if (i === -1) state.favorites.push(id); else state.favorites.splice(i, 1);
  saveState(); refreshFavButtons();
}

function toggleCompare(id) {
  const i = state.compare.indexOf(id);
  if (i !== -1) { state.compare.splice(i, 1); }
  else {
    if (state.compare.length >= 3) { toast('最多同时对比 3 款产品'); return; }
    state.compare.push(id);
  }
  saveState(); refreshCmpButtons(); renderCompareTray();
}

function refreshFavButtons() {
  $$('[data-action="fav"]').forEach((b) => {
    const on = isFav(b.getAttribute('data-id'));
    b.classList.toggle('on', on);
    if (b.classList.contains('btn')) b.textContent = on ? '♥ 已收藏' : '♥ 收藏';
  });
}

function refreshCmpButtons() {
  $$('[data-action="cmp"]').forEach((b) => {
    const on = inCompare(b.getAttribute('data-id'));
    b.classList.toggle('on', on);
    if (b.classList.contains('btn')) b.textContent = on ? '⇋ 已加入对比' : '⇋ 加入对比';
  });
}

