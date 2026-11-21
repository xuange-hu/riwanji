# 日理万机 · 公网部署指南

> 目标：让任何人都能通过一个网址打开本站。
> 三条路线按「见效速度」排序，可叠加使用。

---

## 路线 A：隧道即时公网（分钟级，免费，无需服务器）

适合：马上要给人看、演示、内测。电脑开着他就能访问。

```powershell
# A1. SSH 反向隧道 → localhost.run（本机已实测成功，零安装，Windows 自带 ssh 即可）
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:localhost:8123 nokey@localhost.run
# 输出 https://xxxx.lhr.life → 发给任何人即可（自带 HTTPS）
# 特点：地址每隔一段时间轮换；关窗口即下线

# A2. Cloudflare Tunnel（更稳定，无限流量；需先下载 cloudflared.exe）
.\tools\bin\cloudflared.exe tunnel --url http://127.0.0.1:8123
# 输出 https://xxxx-xxxx.trycloudflare.com

# A3. ngrok（需注册拿 token）
ngrok config add-authtoken <你的token>
ngrok http 8123
```

**注意**：隧道入口在你这台电脑上——电脑关机/断网，网站就下线。
适合演示；长期公开请走路线 B。

---

## 路线 B：云服务器正式部署（7×24 在线，推荐长期方案）

### 1. 买服务器
- **境外 VPS**（香港/新加坡/日本，1核2G 即够）：**免备案**，买了就能用域名访问
- **国内云**（阿里云/腾讯云 2核4G）：速度快、便宜，但**域名必须 ICP 备案**（约 7–20 个工作日）

### 2. 上传站点
```bash
# 本地打包（只含运行所需：源码 + data 分片 + tools；排除 4.7G 源数据、dist 真仓库与敏感文件）
cd riwanji-site
tar czf ../riwanji-site.tar.gz \
  --exclude='data/bulk' \
  --exclude='data/enrich/_*.json' \
  --exclude='dist' \
  --exclude='.git' --exclude='.git.broken-*' --exclude='dist/.git' \
  --exclude='tools/tunnel-url.txt' --exclude='tools/tunnel-log.txt*' --exclude='tools/.ssh-known-hosts' \
  --exclude='*.zip' --exclude='node_modules' --exclude='.DS_Store' --exclude='*.tmp' .

# 传到服务器
scp ../riwanji-site.tar.gz root@<服务器IP>:/opt/
ssh root@<服务器IP>
mkdir -p /opt/riwanji-site && tar xzf /opt/riwanji-site.tar.gz -C /opt/riwanji-site
```

> 关于「root 源码 / `dist/` 真仓库 / `data/bulk/` 不入库」的结构说明与从零 clone 后的重建方式，
> 见 README「仓库结构说明」章节。路线 B 只上传运行所需文件，不含 4.7 GB bulk 与任何 `.git` 元数据。

### 3. 安装 Node 并启动
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs          # node ≥ 20（CI 用 20）
cd /opt/riwanji-site

# 前台验证
node --max-old-space-size=6144 tools/serve.js --port 8123
# curl -s localhost:8123/api/meta | head -c 200  应返回 JSON

# 用 pm2 守护（崩溃自动拉起 + 开机自启）
npm i -g pm2
pm2 start tools/serve.js --name riwanji --node-args="--max-old-space-size=6144" -- --port 8123
pm2 save && pm2 startup          # 按提示执行开机自启命令
```

### 4. Nginx 反代 + HTTPS（免费证书）
```nginx
# /etc/nginx/sites-available/riwanji
server {
    listen 80;
    server_name your-domain.com;
    gzip on;
    gzip_types application/json text/css application/javascript image/svg+xml;
    gzip_min_length 1024;

    location / {
        proxy_pass http://127.0.0.1:8123;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
```bash
ln -s /etc/nginx/sites-available/riwanji /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# HTTPS（Let's Encrypt 免费证书，自动续期）
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com    # 全程回车，自动改配置
```

### 5. 防火墙
```bash
ufw allow 22,80,443/tcp && ufw enable
# 8123 不对外：只给 Nginx 本机回源
```

---

## 路线 C：Gitee Pages 纯静态托管（零服务器、零费用、国内直连）

站点自带静态模式（`data/*.js` 分片 + file:// 可跑），已构建好部署包 **`dist/`**（git 仓库已初始化）：

```powershell
# 1) 生成部署包（一键构建 dist/：外壳 + js/css 模块 + 全部数据分片 + 本地图片 + README）
node tools/build-dist.js

# 2) （可选）调整静态版产品规模后重建
node tools/export-static-bulk.js --count 10000 --per-shard 200   # 热门 SKU → data/gen/
node tools/build-manifest.js                                     # 重建清单
node tools/build-index.js                                        # 重建演示轻索引（动过演示数据必跑，漏了会数据漂移）
node tools/build-dist.js                                         # 重建部署包
```

> **部署到非官方地址（Gitee / 自有域名）先在构建前设 `SITE_URL`**：`build-dist.js` 已内联预渲染，
> sitemap / RSS / canonical / OG / robots 绝对地址默认指向 `https://xuange-hu.github.io/riwanji/`，
> 须在同一 shell 设 `SITE_URL` 后再构建，才会统一改写为目标地址（不要重复单独执行 `prerender.js`）：
>
> ```powershell
> # PowerShell（先设，再构建）
> $env:SITE_URL = "https://<你的用户名>.gitee.io/riwanji/"; node tools/build-dist.js
> # bash
> SITE_URL=https://<你的用户名>.gitee.io/riwanji/ node tools/build-dist.js
> ```

**推送 Gitee 三步**（Gitee 网页先建空仓库，如 `riwanji`）：

```powershell
cd dist
git remote add origin https://gitee.com/<你的用户名>/riwanji.git
git push -u origin master
```

然后 Gitee 仓库页 →「服务」→「Gitee Pages」→ 启动（分支 `master`，目录 `/`）→
得到永久固定地址 `https://<你的用户名>.gitee.io/riwanji/`。

**Gitee Pages 免费版不会自动发布**：首次启动后，每次向 `dist` 仓库 push 新产物，都必须再到
仓库页「服务」→「Gitee Pages」手动点一次「更新」，线上才会刷新；GitHub Pages 随 push 自动发布。

### 双远程发布与 SEO 归属

`dist/` 仓库同时配置了 GitHub（`github`）与 Gitee（`origin`）远程，但产物内的 canonical / OG / RSS /
robots 固化为构建时的**单一** `SITE_URL`（默认主站 `https://xuange-hu.github.io/riwanji/`）。
这是刻意设计：Gitee 镜像站的 canonical 仍指向主站，避免搜索引擎把两个域名判为重复内容、稀释权重。
若确实要把 Gitee 站作为**独立分站**（而非镜像）发布，请用各自的 `SITE_URL` 分别构建两套产物、
推到各自远程目录，不要拿同一份 `dist/` 同时发布两个域名。

**静态版内容**（构建时 Observed 实测）：
- **10,346 个产品**：346 精选（真实图集 + 测评索引）+ 10,000 热门 SKU
- 演示样本自身覆盖 **106 个品类 / 584 个品牌**（全库合计 106 个品类 / 657 个品牌），全功能可用（搜索/筛选/品牌细分/对比/收藏/时间线/排行榜）
- 每产品 ≥3 图（真实图优先，SVG 海报变体补足）
- 已适配 Gitee Pages 子路径部署（全相对路径，静态审计 5/5 通过）
- 限制：`tools/serve.js` 是开发/回归参考实现（多轮全库扫描、gzipSync 同步压缩、无请求频控），
  **不能直接等同于可承受 200 万 SKU 公网流量**；海量数据请按 README「规模化路径」
  迁移数据库 + 服务端检索（如 Meilisearch）。静态版为精选 + 热门快照

| 平台 | 免费额度 | 国内可访问性 |
|---|---|---|
| GitHub Pages | 无限流量 | 需科学上网 |
| Gitee Pages | 免费 | 直连（需实名） |
| Vercel / Netlify | 免费 100GB/月 | 部分地区慢 |
| Cloudflare Pages | 免费无限流量 | 较好 |

---

## 推荐组合

| 场景 | 方案 | 耗时 | 费用 |
|---|---|---|---|
| **现在就要给人看** | 路线 A（cloudflared） | 2 分钟 | 0 |
| **长期正式公开** | 路线 B（香港 VPS + 域名 + HTTPS） | 1–2 小时 | ≈ 30–60 元/月 |
| **只要精选产品展示** | 路线 C（Gitee Pages） | 30 分钟 | 0 |

---

## 公开前检查清单

- [x] 安全响应头（X-Content-Type-Options / X-Frame-Options / Referrer-Policy）已在参考服务器 `tools/serve.js` 实现；纯静态托管需在 CDN / Nginx 等承载层另行注入（GitHub / Gitee Pages 不支持自定义响应头）
- [x] 路径穿越防护（normalize + 分隔符边界 + realpath 实路径约束 + 隐藏文件拒绝，见 serve.js 静态文件处理）
- [x] API 全只读（无写接口，无需鉴权）
- [x] 搜索/输入全量转义（XSS 防护已过 27 项边缘用例）
- [x] 图源 100% https（无混合内容）
- [ ] 服务器内存充足（serve.js 数据全量驻留内存；海量 SKU 场景先迁移数据库 + 服务端检索，见上文限制）
- [ ] 域名备案（仅国内服务器需要）
