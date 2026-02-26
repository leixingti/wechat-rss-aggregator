# 腾讯云服务器完整部署指南

**目标服务器：** 43.167.164.233
**操作系统：** Ubuntu Server 24.04 LTS 64bit
**部署时间：** 约 30-45 分钟

---

## 目录

1. [前置准备](#前置准备)
2. [第一阶段：SSH 连接和系统初始化](#第一阶段ssh-连接和系统初始化)
3. [第二阶段：安装依赖软件](#第二阶段安装依赖软件)
4. [第三阶段：创建数据目录](#第三阶段创建数据目录)
5. [第四阶段：部署项目代码](#第四阶段部署项目代码)
6. [第五阶段：配置 PM2 进程管理](#第五阶段配置-pm2-进程管理)
7. [第六阶段：配置 Nginx 反向代理](#第六阶段配置-nginx-反向代理)
8. [第七阶段：HTTPS 配置（可选）](#第七阶段https-配置可选)
9. [第八阶段：验证和测试](#第八阶段验证和测试)
10. [常见问题解决](#常见问题解决)

---

## 前置准备

### 1. 确认服务器可访问性

```bash
# 检查与腾讯云服务器的连接
ping 43.167.164.233

# 如果能 ping 通，则网络正常
# 如果不能，检查：
# 1. 腾讯云安全组设置
# 2. 本地网络连接
```

### 2. 配置 SSH 密钥（推荐）

```bash
# 在本地机器生成 SSH 密钥（如果没有的话）
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""

# 查看公钥内容
cat ~/.ssh/id_rsa.pub

# 将公钥内容添加到腾讯云服务器的 ~/.ssh/authorized_keys
# 通过腾讯云控制台的 VNC 连接：
# 1. 用密码登录
# 2. 编辑 ~/.ssh/authorized_keys
# 3. 将公钥粘贴进去
# 4. 保存并重启 SSH 服务
```

### 3. 腾讯云安全组配置

在腾讯云控制台中配置以下入站规则：

| 协议 | 端口 | 来源 | 说明 |
|------|------|------|------|
| TCP | 22 | 你的 IP | SSH 访问 |
| TCP | 80 | 0.0.0.0/0 | HTTP |
| TCP | 443 | 0.0.0.0/0 | HTTPS（可选）|
| TCP | 3000 | 127.0.0.1 | 应用内部端口 |

---

## 第一阶段：SSH 连接和系统初始化

### 步骤 1.1：连接到服务器

```bash
# 使用 SSH 密钥连接
ssh -i ~/.ssh/id_rsa ubuntu@43.167.164.233

# 或使用密码连接（首次）
ssh ubuntu@43.167.164.233
```

### 步骤 1.2：验证系统信息

连接成功后，验证系统版本：

```bash
# 检查 Ubuntu 版本
lsb_release -a
# 应该显示：Ubuntu 24.04 LTS

# 检查 CPU 核心数
nproc
# 了解后续 PM2 进程数配置

# 检查内存
free -h

# 检查磁盘空间
df -h

# 检查时区（腾讯云默认为 UTC）
date
timedatectl

# 如果时区不对，改为中国时区
sudo timedatectl set-timezone Asia/Shanghai
```

### 步骤 1.3：更新系统

```bash
# 获取 root 权限
sudo -i

# 更新软件包列表
apt update

# 升级已安装的软件
apt upgrade -y

# 安装基础工具
apt install -y curl wget git build-essential vim htop net-tools

# 验证安装
git --version
curl --version
```

---

## 第二阶段：安装依赖软件

### 步骤 2.1：安装 Node.js 18 LTS

```bash
# 添加 NodeSource 官方仓库
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# 安装 Node.js
apt install -y nodejs

# 验证安装版本
node --version   # 应该显示 v18.x.x
npm --version    # 应该显示 8.x.x 或更高
```

### 步骤 2.2：安装 PM2（进程管理器）

```bash
# 全局安装 PM2
npm install -g pm2

# 验证版本
pm2 --version

# 设置 PM2 开机自启
pm2 startup systemd -u ubuntu --hp /home/ubuntu
pm2 save

# 验证设置
systemctl status pm2-ubuntu
```

### 步骤 2.3：安装 Nginx

```bash
# 安装 Nginx
apt install -y nginx

# 启动 Nginx
systemctl start nginx

# 设置开机自启
systemctl enable nginx

# 验证状态
systemctl status nginx

# 检查 Nginx 版本
nginx -v
```

### 步骤 2.4：安装 SSL 工具（可选但推荐）

```bash
# 安装 Certbot（Let's Encrypt 证书工具）
apt install -y certbot python3-certbot-nginx

# 验证安装
certbot --version
```

---

## 第三阶段：创建数据目录

### 步骤 3.1：创建持久化数据目录

```bash
# 创建数据目录
sudo mkdir -p /data

# 创建日志目录
sudo mkdir -p /var/log/wechat-rss

# 设置目录权限（允许 ubuntu 用户访问）
sudo chown ubuntu:ubuntu /data /var/log/wechat-rss
sudo chmod 755 /data /var/log/wechat-rss

# 验证目录创建
ls -la / | grep data
ls -la /var/log | grep wechat-rss

# 创建数据库目录
mkdir -p /data
chmod 755 /data
```

### 步骤 3.2：验证目录权限

```bash
# 检查当前用户
whoami

# 测试写入权限
touch /data/test.txt
echo "测试内容" > /data/test.txt
cat /data/test.txt
rm /data/test.txt

# 如果能成功写入，则权限正确
```

---

## 第四阶段：部署项目代码

### 步骤 4.1：克隆项目代码

```bash
# 切换到 ubuntu 用户的主目录
cd /home/ubuntu

# 克隆项目（公开仓库）
git clone https://github.com/your-username/wechat-rss-aggregator.git
cd wechat-rss-aggregator

# 如果是私有仓库，需要配置 SSH 密钥
# 1. 在服务器上生成 SSH 密钥
#    ssh-keygen -t rsa -b 4096 -f ~/.ssh/github_key -N ""
#
# 2. 将公钥添加到 GitHub Deploy Keys
#    cat ~/.ssh/github_key.pub
#
# 3. 配置 SSH 客户端
#    nano ~/.ssh/config
#    # 添加以下内容：
#    # Host github.com
#    #   IdentityFile ~/.ssh/github_key
#
# 4. 测试连接
#    ssh -T git@github.com
#
# 5. 克隆仓库
#    git clone git@github.com:your-username/wechat-rss-aggregator.git
```

### 步骤 4.2：验证项目文件

```bash
# 查看项目文件
ls -la /home/ubuntu/wechat-rss-aggregator

# 应该看到以下重要文件：
# - server.js
# - package.json
# - .env.example
# - .env.production
# - ecosystem.config.js
# - database.js
# - public/
# - logs/（如果不存在，稍后会创建）
```

### 步骤 4.3：安装 npm 依赖

```bash
# 进入项目目录
cd /home/ubuntu/wechat-rss-aggregator

# 安装生产环境依赖
npm install --production

# 验证依赖安装
npm list

# 应该看到所有依赖已安装
```

### 步骤 4.4：配置环境变量

```bash
# 检查 .env 文件
ls -la .env .env.*

# 如果 .env 不存在，从 .env.production 复制
cp .env.production .env

# 编辑 .env 文件（可选：配置 API 密钥）
nano .env

# 关键配置项：
# PORT=3000
# HOST=0.0.0.0
# NODE_ENV=production
# DB_PATH=/data/articles.db
# CONFIG_PATH=/data
# LOG_DIR=/var/log/wechat-rss

# 退出编辑器：Ctrl+X, 然后 Y, 再 Enter

# 验证配置
cat .env
```

### 步骤 4.5：创建日志目录

```bash
# 进入项目目录
cd /home/ubuntu/wechat-rss-aggregator

# 创建日志目录
mkdir -p logs

# 设置权限
chmod 755 logs

# 验证
ls -la logs
```

---

## 第五阶段：配置 PM2 进程管理

### 步骤 5.1：启动应用

```bash
# 进入项目目录
cd /home/ubuntu/wechat-rss-aggregator

# 使用 PM2 启动应用（使用生产环境配置）
pm2 start ecosystem.config.js --env production

# 验证应用状态
pm2 status

# 应该看到：
# id  │ name       │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu  │ memory
# ──  │ wechat-rss │ default     │ 1.0.0   │ cluster │ multiple │ 0s     │ 0    │ running   │ 0%   │ 0 B
```

### 步骤 5.2：查看应用日志

```bash
# 查看应用日志（最近 50 行）
pm2 logs wechat-rss --lines 50

# 持续监控日志（按 Ctrl+C 退出）
pm2 logs wechat-rss --follow

# 查看错误日志
pm2 logs wechat-rss --err

# 查看应用详细信息
pm2 show wechat-rss

# 实时监控资源使用
pm2 monit
```

### 步骤 5.3：设置开机自启

```bash
# 创建开机自启配置
pm2 startup systemd -u ubuntu --hp /home/ubuntu

# 保存 PM2 状态
pm2 save

# 验证设置
pm2 list

# 重启服务器后，应用应该自动启动
sudo reboot
```

### 步骤 5.4：PM2 常用命令

```bash
# 重启应用
pm2 restart wechat-rss

# 停止应用
pm2 stop wechat-rss

# 启动应用
pm2 start wechat-rss

# 删除应用
pm2 delete wechat-rss

# 清空日志
pm2 flush

# 查看所有应用
pm2 list
```

---

## 第六阶段：配置 Nginx 反向代理

### 步骤 6.1：创建 Nginx 配置

```bash
# 备份原配置
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.bak

# 编辑配置文件
sudo nano /etc/nginx/sites-available/default

# 删除全部内容，粘贴以下配置：
```

```nginx
upstream wechat_rss_backend {
  server 127.0.0.1:3000;
  keepalive 64;
}

server {
  listen 80 default_server;
  listen [::]:80 default_server;
  server_name _;

  client_max_body_size 50M;
  access_log /var/log/nginx/wechat-rss.log combined buffer=32k flush=5s;
  error_log /var/log/nginx/wechat-rss-error.log warn;

  location / {
    proxy_pass http://wechat_rss_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    proxy_buffering off;
    proxy_request_buffering off;
    proxy_cache_bypass $http_upgrade;
  }

  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
    access_log off;
  }

  location ~ /\. {
    deny all;
    access_log off;
    log_not_found off;
  }
}
```

### 步骤 6.2：验证和重启 Nginx

```bash
# 测试 Nginx 配置文件语法
sudo nginx -t

# 如果显示 "ok"，则配置正确

# 重启 Nginx
sudo systemctl restart nginx

# 验证 Nginx 状态
sudo systemctl status nginx

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/wechat-rss.log
```

### 步骤 6.3：测试应用可访问性

```bash
# 从本地机器测试（在本机打开终端）
curl http://43.167.164.233/

# 或在浏览器中访问
# http://43.167.164.233/

# 查看健康检查端点
curl http://43.167.164.233/health
```

---

## 第七阶段：HTTPS 配置（可选）

如果有域名，可以配置免费 SSL 证书。

### 步骤 7.1：配置域名 DNS

1. 在域名提供商处，将 A 记录指向 `43.167.164.233`
2. 等待 DNS 生效（通常 5-30 分钟）

```bash
# 验证 DNS 生效
nslookup example.com
# 应该显示 43.167.164.233
```

### 步骤 7.2：申请 SSL 证书

```bash
# 使用 Certbot 申请免费的 Let's Encrypt 证书
sudo certbot --nginx -d example.com -d www.example.com

# 按提示填写邮箱和同意条款

# 验证证书
sudo certbot certificates

# 自动更新设置
sudo systemctl status certbot.timer
```

### 步骤 7.3：验证 HTTPS

```bash
# 测试 HTTPS 连接
curl https://example.com/

# 在浏览器中访问
# https://example.com/
```

---

## 第八阶段：验证和测试

### 步骤 8.1：完整的系统检查

```bash
# 一键检查脚本
echo "=== 系统信息 ===" && \
uname -a && \
echo "" && \
echo "=== Node.js 版本 ===" && \
node --version && \
npm --version && \
echo "" && \
echo "=== PM2 状态 ===" && \
pm2 status && \
echo "" && \
echo "=== Nginx 状态 ===" && \
sudo systemctl status nginx && \
echo "" && \
echo "=== 端口监听 ===" && \
netstat -tlnp | grep -E ':(80|443|3000)' && \
echo "" && \
echo "=== 应用响应 ===" && \
curl -s http://127.0.0.1/health | jq .
```

### 步骤 8.2：功能测试

```bash
# 测试各个 API 端点
echo "测试健康检查..."
curl http://43.167.164.233/health

echo "测试文章列表..."
curl http://43.167.164.233/api/articles

echo "测试统计数据..."
curl http://43.167.164.233/api/stats

echo "测试会议列表..."
curl http://43.167.164.233/api/conferences
```

### 步骤 8.3：WebSocket 测试

```bash
# 创建 WebSocket 测试脚本
cat > /tmp/ws_test.js << 'EOF'
const WebSocket = require('ws');

const ws = new WebSocket('ws://43.167.164.233/');

ws.on('open', () => {
  console.log('WebSocket 已连接');
});

ws.on('message', (data) => {
  console.log('收到消息:', data);
});

ws.on('error', (error) => {
  console.error('WebSocket 错误:', error);
});

setTimeout(() => {
  ws.close();
  console.log('连接关闭');
  process.exit(0);
}, 5000);
EOF

node /tmp/ws_test.js
```

---

## 常见问题解决

### 问题 1：应用无法启动

```bash
# 检查错误日志
pm2 logs wechat-rss --err

# 常见原因：
# 1. 数据库权限问题
#    ls -la /data
#    chmod 755 /data
#
# 2. 端口被占用
#    netstat -tlnp | grep 3000
#    lsof -i :3000
#
# 3. 环境变量配置错误
#    cat .env
#    cp .env.production .env
```

### 问题 2：访问时 503 Bad Gateway

```bash
# 检查后端应用是否运行
pm2 status

# 检查 Nginx 错误日志
sudo tail -f /var/log/nginx/wechat-rss-error.log

# 检查应用日志
pm2 logs wechat-rss

# 测试本地连接
curl http://127.0.0.1:3000/

# 重启 Nginx
sudo systemctl restart nginx
```

### 问题 3：WebSocket 连接失败

```bash
# 检查 Nginx 配置中的 Upgrade 和 Connection 头
grep -A 2 "Upgrade" /etc/nginx/sites-available/default

# 应该包含：
# proxy_set_header Upgrade $http_upgrade;
# proxy_set_header Connection 'upgrade';

# 重新加载 Nginx 配置
sudo nginx -t && sudo systemctl reload nginx
```

### 问题 4：内存持续增长

```bash
# 检查内存使用
free -h

# 检查 PM2 进程内存
pm2 show wechat-rss

# 重启应用
pm2 restart wechat-rss

# 设置内存限制重启应用
pm2 restart wechat-rss --max-memory-restart 500M
```

### 问题 5：数据库文件不存在

```bash
# 检查数据库位置
ls -la /data/articles.db

# 如果不存在，重启应用会自动创建
pm2 restart wechat-rss

# 监控日志看是否初始化
pm2 logs wechat-rss --follow
```

---

## 维护和监控

### 日常监控

```bash
# 每日检查应用状态
pm2 status

# 查看最新日志
pm2 logs wechat-rss --lines 100

# 监控系统资源
htop

# 或使用 PM2 监控
pm2 monit
```

### 自动备份

```bash
# 创建备份脚本
cat > /home/ubuntu/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/wechat-rss-$DATE.tar.gz \
  /data/articles.db \
  /home/ubuntu/wechat-rss-aggregator/.env
find $BACKUP_DIR -name "wechat-rss-*.tar.gz" -mtime +7 -delete
EOF

chmod +x /home/ubuntu/backup.sh

# 添加到 cron 定时任务（每天凌晨3点备份）
crontab -e
# 添加：0 3 * * * /home/ubuntu/backup.sh
```

### 日志轮转

```bash
# 为 PM2 安装日志轮转插件
pm2 install pm2-logrotate

# 配置日志轮转
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 7

# 保存配置
pm2 save
```

---

## 升级应用

```bash
# 进入项目目录
cd /home/ubuntu/wechat-rss-aggregator

# 拉取最新代码
git pull origin main

# 更新依赖
npm install --production

# 重启应用
pm2 restart wechat-rss

# 验证升级成功
pm2 logs wechat-rss --lines 50
```

---

## 快速参考

| 操作 | 命令 |
|------|------|
| 查看应用状态 | `pm2 status` |
| 查看应用日志 | `pm2 logs wechat-rss` |
| 重启应用 | `pm2 restart wechat-rss` |
| 停止应用 | `pm2 stop wechat-rss` |
| 启动应用 | `pm2 start ecosystem.config.js` |
| 检查 Nginx | `sudo systemctl status nginx` |
| 重启 Nginx | `sudo systemctl restart nginx` |
| 查看系统日志 | `sudo journalctl -u wechat-rss` |
| 测试应用 | `curl http://43.167.164.233/health` |

---

**祝部署成功！** 🎉
