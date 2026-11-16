# CHANGELOG

## v1.2.0 — 2026-11-16

第二轮审查报告（N1–N17）与第一轮遗留问题修复批次：

### 架构
- **app.js 模块化拆分（问题 40）**：2,232 行 IIFE 单体 → 7 个经典脚本模块
  （util→data→state→router→components→pages→app 按依赖序加载），
  不用 ES module 以保留 file:// 双击即开特性；smoke-test 同步多文件加载器
- **冷启动重构（N3）**：首屏只载 35 片（26 精选 + 9 enrich），演示轻索引 5.4MB
  改为开演示开关/访问演示产品时按需装载（ensureBulk 状态机）
- **统计口径单源（N9）**：manifest.stats 由 build-manifest.js 全量实算，
  首页/品类页/关于页/品牌页/og/README 全部引用同一数字

### 数据质量
- **演示数据 pros/cons 组合全局去重（N8）**：采样互不重复条目 + 组合 key 80 次
  重试 + 品类池∪通用池扩容（C(24,3)=2,024 组合/品类），重复 1,370 组 → 0
- stats.js 合并 enrich 图片/测评口径（curatedImages 10→1,025、mediaLinks 11→38）（N6）
- static-audit 新增 index.html DOM 断言 + 轻索引与 gen 分片交叉校验（N7）

### 可信度
- **图片本地化（N17）**：1,021 张精选产品图镜像到 img/（110MB），
  url→本地路径覆盖表（data/enrich-local.js），热链防盗链失效不再全站开天窗；
  预渲染页 og:image/图片引用转站内绝对 URL
- **测评兜底诚实标注（问题 13）**：媒体链接缺失时统一「🔎 全网搜索直达」，
  不再冒充机构/媒体/社区分组
- **JSON-LD 诚实化（N5）**：移除 aggregateRating 冒充用户聚合，改 Review schema
  （author=日理万机编辑部）；预渲染页补充主客观评测摘要/优缺点/参数表（N15）
- og/twitter description 与实际统计口径对齐（N15）

### 交互与可访问性
- **收藏导出（问题 30）**：收藏/对比支持导出 JSON、分享链接 #/favorites?ids= 导入、
  对比页导出
- 表格 sticky 修复（N4，border-collapse→separate）；卡片嵌套交互修复（N13，
  标题改真实链接）；对比表 th scope 语义（N16）；点击目标 ≥44px（N14）
- 浅色主题渐变文字对比度 ≥3.3:1（N10）；skip-link 转义引号修复（N1）；
  单一 footer（N11）；menu-toggle aria-expanded/aria-controls（N12）
- README 校准：移除「200 万+ SKU」过期宣称，文档结构与实际文件对齐

## v1.1.0 — 2026-11-12

前端审查报告（46 项）修复批次：

### 加载架构
- bulk 演示数据改走轻索引（data/index.js）+ 按需懒加载，首屏请求从 147 降到 ~30（问题 3）
- 分片加载失败自动重试 1 次 + toast 提示 + 控制台 warn + 诊断计数（问题 6）
- 加载进度实时刷新（问题 3 遗留）

### 数据质量
- 新版 bulk 生成器 gen-bulk-v2.js：按品类 kind 模板生成规范参数/价格/命名，
  杜绝参数沙拉、"Brand Brand" 摘要、品类词产品名；带 provenance（种子/生成器/schema）（问题 21/45）
- 统计口径单源 tools/stats.js，README 数字由脚本校验（问题 12/37）

### 可信度
- 演示数据默认隐藏 + 全局开关 + 全 surface 统一 badge + 统计口径分离（问题 4）

### 交互
- 时间线年份可展开全年（问题 27）；分页页码窗口 + 跳页（问题 26）
- 对比「只看差异」+ 跨品类提示 + 分享链接 #/compare?ids=（问题 22/30）
- 清空收藏/对比/最近搜索、删除笔记均可 5 秒撤销（问题 31）
- 排行榜表头按钮化，键盘可排序（问题 10）

### 可访问性
- skip link、aria-live 路由播报、combobox/listbox、菜单 aria-expanded、
  卡片 Space 激活、缩略图可聚焦、奖牌读屏文本（问题 17/32）

### 主题与存储
- 默认跟随系统深浅色，手动切换后记忆（问题 28）
- 多标签收藏/对比/主题/笔记同步（storage 事件）（问题 28）
- localStorage 前缀统一 rlwj:*，旧键自动迁移（问题 29）

### SEO
- 精选 346 条预渲染真实路径 /p/<id>.html + JSON-LD Product + canonical/og（问题 18）
- sitemap.xml 重写收录预渲染页；feed.xml RSS 更新通道（问题 46）
- 评价改名「我的本机笔记」并披露存储位置；评分不再预选（问题 14）

### 性能
- 静态装饰动画只播一次，扫光改悬停触发；backdrop-filter 限头部/弹层（问题 24）
- 首页榜单/品类卡片截断 + 查看全部（问题 25）
- img 带 width/height 防布局偏移（问题 34）

### 工程化
- CI 四件套（validate / stats --check / smoke / static-audit）（问题 39）
- 诊断面板（分片成功/失败、图片降级计数）（问题 42）
- CONFIG 集中配置收口魔法数字（问题 41）
- 打印样式（问题 33）；图片本地化工具 tools/localize-images.js（问题 20）
- 仓库补 tools/、DEPLOY.md、LICENSE、CHANGELOG（问题 19/44）

## v1.0.0 — 2026-11-11

- 初始静态站：10,346 产品（346 精选 + 10,000 演示）/ 106 品类 / 656 品牌
- 搜索/筛选/品牌细分/对比/收藏/时间线/排行榜
- Phase 0 硬伤修复（图集缩略图、表格横滑、404 归零、对比度 AA 等）
