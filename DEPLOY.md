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
# 本地打包（排除缓存）
cd riwanji-site
tar czf ../riwanji-site.tar.gz --exclude='data/enrich/_*.json' .

# 传到服务器
scp ../riwanji-site.tar.gz root@<服务器IP>:/opt/
ssh root@<服务器IP>
mkdir -p /opt/riwanji-site && tar xzf /opt/riwanji-site.tar.gz -C /opt/riwanji-site
```

### 3. 安装 Node 并启动
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs          # node ≥ 18
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

站点自带静态模式（`data/*.js` 分片 + file:// 可跑），已构建好部署包 **`dist/`**（148 文件 / 18.5MB / git 仓库已初始化）：

```powershell
# 1) 生成部署包（一键构建 dist/：外壳 + js/css + 131 数据分片 + README）
node tools/build-dist.js

# 2) （可选）调整静态版产品规模后重建
node tools/export-static-bulk.js --count 10000 --per-shard 200   # 热门 SKU → data/gen/
node tools/build-manifest.js                                     # 重建清单
node tools/build-dist.js                                         # 重建部署包
```

**推送 Gitee 三步**（Gitee 网页先建空仓库，如 `riwanji`）：

```powershell
cd dist
git remote add origin https://gitee.com/<你的用户名>/riwanji.git
git push -u origin master
```

然后 Gitee 仓库页 →「服务」→「Gitee Pages」→ 启动（分支 `master`，目录 `/`）→
得到永久固定地址 `https://<你的用户名>.gitee.io/riwanji/`。

**静态版内容**（构建时 Observed 实测）：
- **10,346 个产品**：347 精选（真实图集 + 测评索引）+ 10,000 热门 SKU
- 覆盖 **106 个品类 / 656 品牌**，全功能可用（搜索/筛选/品牌细分/对比/收藏/时间线/排行榜）
- 每产品 ≥3 图（真实图优先，SVG 海报变体补足）
- 已适配 Gitee Pages 子路径部署（全相对路径，静态审计 5/5 通过）
- 限制：200 万海量 SKU 依赖 Node 服务端（路线 B）；静态版为精选+热门快照

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

- [x] 安全响应头（X-Content-Type-Options / X-Frame-Options / Referrer-Policy）已加
- [x] 路径穿越防护（`abs.startsWith(ROOT)`）
- [x] API 全只读（无写接口，无需鉴权）
- [x] 搜索/输入全量转义（XSS 防护已过 27 项边缘用例）
- [x] 图源 100% https（无混合内容）
- [ ] 服务器内存 ≥ 2GB（200 万 SKU 索引驻留 ≈ 1.2GB）
- [ ] 域名备案（仅国内服务器需要）
