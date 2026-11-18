/* js/theme-init.js — 主题预加载（问题 21）：避免闪烁；无存储偏好时跟随系统。
   外联化（问题 79）：不再使用内联 <script>，为严格 CSP（script-src 'self'）让路。
   必须在 css/style.css 之前执行；经典脚本阻塞解析，顺序天然保证。 */
try {
  var raw = localStorage.getItem('rlwj:theme');
  var t;
  if (raw) { t = JSON.parse(raw); }
  else { t = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark'; }
  document.documentElement.setAttribute('data-theme', t);
} catch (e) { document.documentElement.setAttribute('data-theme', 'dark'); }
