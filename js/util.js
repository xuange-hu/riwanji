/* js/util.js — 工具层：DOM 查询 / 转义 / 提示 / 本地存储（app.js 拆分模块 1/7）
   加载序：util → data → state → router → components → pages → app */
'use strict';

/* ================= 工具 ================= */

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
/* 分享链接基址（问题 30）：file:// 下 origin 是字符串 "null"，用完整地址去 hash 拼接 */
function shareBase() {
  const o = location.origin;
  if (!o || o === 'null' || String(location.protocol) === 'file:') return String(location.href || '').split('#')[0];
  return o + location.pathname;
}
/* 安全解码：非法百分号编码（如 %E0%A4%A）不抛 URIError 导致白屏 */
const safeDecode = (s) => { try { return decodeURIComponent(s || ''); } catch (e) { return String(s || ''); } };
/* P2-14：外链协议白名单——只放行 http/https，阻断 javascript:/data:/vbscript: 等点击型注入。
   当前 27 条 media 全为 https（不可触发），此处为第三方导入/数据污染提供纵深。 */
const safeUrl = (u) => {
  try {
    const s = String(u || '').trim();
    if (/^https?:\/\//i.test(s)) return s;
    return '#';
  } catch (e) { return '#'; }
};
const fmtScore = (n) => (typeof n === 'number' ? n.toFixed(1) : '–');
const fmtNum = (n) => (typeof n === 'number' ? n.toLocaleString('en-US') : String(n));
/* 本地日期 YYYY-MM-DD（问题 69）：toISOString 是 UTC，中国凌晨 0–8 点会显示前一天 */
function localDate(d) {
  const x = d || new Date();
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
}

/* Toast 元素工厂（问题 P3-5）：撤销 Toast 与普通 Toast 用独立元素 + 独立定时器，
   避免撤销期内的普通提示清空撤销按钮、吞掉撤销机会 */
function toastEl(id) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.className = 'toast' + (id === 'toast-undo' ? ' toast-undo-bar' : '');
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  return el;
}

/* 可撤销 Toast（问题 31）：5 秒内点「撤销」回滚快照 */
function toastUndo(msg, undoFn) {
  const el = toastEl('toast-undo');
  el.innerHTML = '';
  el.appendChild(document.createTextNode(msg + ' '));
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = '撤销';
  b.className = 'toast-undo';
  b.addEventListener('click', () => {
    el.classList.remove('show');
    undoFn();
  });
  el.appendChild(b);
  el.classList.add('show');
  clearTimeout(toastUndo._t);
  toastUndo._t = setTimeout(() => el.classList.remove('show'), 5000);
}

/* 轻量 Toast 提示 */
function toast(msg) {
  const el = toastEl('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 1800);
}
function fallbackCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  /* 问题 31：execCommand 返回 false 也是失败，不能当成功提示 */
  try {
    const ok = document.execCommand('copy');
    if (ok) done(); else toast('复制失败，请手动复制地址栏链接');
  } catch (e) { toast('复制失败，请手动复制地址栏链接'); }
  document.body.removeChild(ta);
}

/* 集中配置（问题 41）：散落的魔法数字统一收口 */
const CONFIG = {
  PAGE_SIZE: 24,         /* 列表每页条数 */
  TIMELINE_PREVIEW: 8,   /* 时间线每年默认展示条数 */
  RECENT_MAX: 8,         /* 最近搜索保留条数 */
  COMPARE_MAX: 3         /* 对比上限 */
};

/* 诊断计数器（问题 42）：线上静默失败可观测，关于页有面板 */
const DIAG = { shardOk: 0, shardFail: 0, imgFail: 0 };
window.__rlwjDiag = DIAG;

const store = {
  get(k, d) {
    try {
      const v = JSON.parse(localStorage.getItem('rlwj:' + k));
      if (v == null) return d;
      /* 类型校验（问题 28）：合法 JSON 但类型不符（如 favorites 存了 {}）直接回默认，防 indexOf 崩溃 */
      if (Array.isArray(d)) return Array.isArray(v) ? v : d;
      if (typeof d === 'object' && d !== null) {
        return (typeof v === 'object' && v !== null && !Array.isArray(v)) ? v : d;
      }
      return typeof v === typeof d ? v : d;
    } catch (e) { return d; }
  },
  set(k, v) {
    try { localStorage.setItem('rlwj:' + k, JSON.stringify(v)); }
    catch (e) {
      /* 问题 29：配额满/隐私模式不能静默吞——提示一次，避免用户以为已保存 */
      if (!store._warned) { store._warned = true; toast('浏览器存储不可用，本次更改不会被保存'); }
    }
  }
};

