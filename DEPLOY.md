# MathCanvas Ubuntu 部署说明

MathCanvas 使用单服务器部署：Nginx 监听公网端口 `16021`，并把请求转发给只监听本机 `127.0.0.1:3021` 的 Node.js 服务。

## 1. 安装基础软件

以下命令均使用 `root` 用户执行，不需要 `sudo`：

```bash
apt update
apt install -y nginx git curl build-essential python3
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

## 2. 创建项目目录并获取代码

```bash
mkdir -p /opt/MathCanvas
git clone https://github.com/LIKE9426334946/MathCanvas.git /opt/MathCanvas
cd /opt/MathCanvas
git checkout main
npm install
npm run build
```

首次启动时会自动创建 `/opt/MathCanvas/backend/data/mathcanvas.db`，并写入内置函数库。

## 3. 创建 systemd 服务

仓库中的完整服务文件位于 `deploy/mathcanvas.service`。复制到 systemd 目录：

```bash
cp /opt/MathCanvas/deploy/mathcanvas.service /etc/systemd/system/mathcanvas.service
systemctl daemon-reload
systemctl enable mathcanvas
systemctl start mathcanvas
systemctl status mathcanvas --no-pager
```

查看实时日志：

```bash
journalctl -u mathcanvas -f
```

## 4. 创建 Nginx 配置

仓库中的完整配置位于 `deploy/nginx-mathcanvas.conf`。复制并启用：

```bash
cp /opt/MathCanvas/deploy/nginx-mathcanvas.conf /etc/nginx/sites-available/mathcanvas
ln -s /etc/nginx/sites-available/mathcanvas /etc/nginx/sites-enabled/mathcanvas
nginx -t
systemctl reload nginx
```

如果软链接已经存在，不需要重复执行 `ln -s`。

## 5. 验证服务

先检查内部 Node.js 服务：

```bash
curl http://127.0.0.1:3021/api/health
```

再检查 Nginx 公网端口：

```bash
curl http://127.0.0.1:16021/api/health
```

浏览器访问：

```text
http://服务器公网IP:16021
```

管理后台：

```text
http://服务器公网IP:16021/admin
```

## 6. 后续更新项目

```bash
cd /opt/MathCanvas
git pull origin main
npm install
npm run build
systemctl restart mathcanvas
systemctl status mathcanvas --no-pager
```

## 完整配置位置

- systemd：`/etc/systemd/system/mathcanvas.service`
- Nginx：`/etc/nginx/sites-available/mathcanvas`
- 项目目录：`/opt/MathCanvas`
- SQLite 数据库：`/opt/MathCanvas/backend/data/mathcanvas.db`
- 内部端口：`3021`
- 外部端口：`16021`
