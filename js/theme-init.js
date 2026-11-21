/* js/theme-init.js — 主题预加载（问题 21）：避免闪烁；无存储偏好时跟随系统。
   外联化（问题 79）：不再使用内联 <script>，为严格 CSP（script-src 'self'）让路。
   必须在 css/style.css 之前执行；经典脚本阻塞解析，顺序天然保证。

   问题 P2-1：主题可能是「跟随系统」模式（themeAuto=true）。该模式下不能沿用
   上次写盘的 theme 快照，否则刷新后系统主题变化不生效；必须实时读 matchMedia。
   问题 P3-1：存储值做严格类型校验，非法 JSON 类型不得写入 data-theme。 */
try {
  var autoRaw = localStorage.getItem('rlwj:themeAuto');
  var auto = autoRaw == null ? true : JSON.parse(autoRaw);
  if (typeof auto !== 'boolean') auto = true;

  var t = null;
  if (!auto) {
    var raw = localStorage.getItem('rlwj:theme');
    if (raw != null) {
      var saved = JSON.parse(raw);
      if (saved === 'light' || saved === 'dark') t = saved;
    }
  }
  /* 跟随系统，或手动值非法 → 用系统当前值 */
  if (t == null) {
    t = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
  }
  document.documentElement.setAttribute('data-theme', t);
} catch (e) {
  document.documentElement.setAttribute('data-theme', 'dark');
}
