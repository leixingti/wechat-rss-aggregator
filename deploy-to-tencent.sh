#!/bin/bash

##############################################
# 腾讯云部署脚本
# 部署地址：43.167.164.233
# 操作系统：Ubuntu Server 24.04 LTS
#
# 使用方法：
# chmod +x deploy-to-tencent.sh
# ./deploy-to-tencent.sh
##############################################

set -e  # 任何命令出错则退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'  # No Color

# 日志函数
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# ==========================================
# 配置变量
# ==========================================

SERVER_IP="43.167.164.233"
SERVER_USER="ubuntu"
SERVER_PORT="22"
DEPLOY_PATH="/home/ubuntu/wechat-rss-aggregator"
GIT_REPO="https://github.com/your-username/wechat-rss-aggregator.git"  # 修改为你的仓库
GITHUB_BRANCH="main"

# 检查 SSH 密钥
SSH_KEY=""
if [ -f ~/.ssh/id_rsa ]; then
  SSH_KEY="~/.ssh/id_rsa"
elif [ -f ~/.ssh/id_ed25519 ]; then
  SSH_KEY="~/.ssh/id_ed25519"
fi

# ==========================================
# 阶段 0：前置检查
# ==========================================

log_info "开始部署前置检查..."

if [ -z "$SSH_KEY" ]; then
  log_error "未找到 SSH 密钥！"
  log_info "请先生成 SSH 密钥："
  log_info "  ssh-keygen -t rsa -b 4096"
  exit 1
fi

log_success "找到 SSH 密钥: $SSH_KEY"

# 测试 SSH 连接
if ! ssh -i "$SSH_KEY" -p "$SERVER_PORT" "$SERVER_USER@$SERVER_IP" "echo 'SSH连接测试'" &>/dev/null; then
  log_error "无法连接到服务器！"
  log_info "请确保："
  log_info "1. 服务器 IP: $SERVER_IP"
  log_info "2. 用户名: $SERVER_USER"
  log_info "3. SSH 密钥已添加到服务器的 ~/.ssh/authorized_keys"
  exit 1
fi

log_success "SSH 连接正常"

# ==========================================
# 阶段 1：云服务器初始化
# ==========================================

log_info "开始云服务器初始化..."

SSH_CMD="ssh -i $SSH_KEY -p $SERVER_PORT $SERVER_USER@$SERVER_IP"

# 1.1 更新系统
log_info "更新系统..."
$SSH_CMD 'sudo apt-get update && sudo apt-get upgrade -y'
log_success "系统更新完成"

# 1.2 安装必要工具
log_info "安装必要工具..."
$SSH_CMD 'sudo apt-get install -y curl wget git build-essential vim htop net-tools'
log_success "必要工具安装完成"

# 1.3 安装 Node.js
log_info "检查 Node.js 版本..."
NODE_VERSION=$($SSH_CMD 'node --version 2>/dev/null || echo ""')

if [ -z "$NODE_VERSION" ]; then
  log_info "安装 Node.js 18 LTS..."
  $SSH_CMD 'curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs'
  log_success "Node.js 18 LTS 安装完成"
else
  log_success "Node.js 已安装: $NODE_VERSION"
fi

# 1.4 安装 PM2
log_info "安装 PM2..."
$SSH_CMD 'sudo npm install -g pm2'
log_success "PM2 安装完成"

# 1.5 安装 Nginx
log_info "安装 Nginx..."
$SSH_CMD 'sudo apt-get install -y nginx'
log_success "Nginx 安装完成"

# 1.6 创建数据目录
log_info "创建数据目录..."
$SSH_CMD 'sudo mkdir -p /data /var/log/wechat-rss && sudo chown ubuntu:ubuntu /data /var/log/wechat-rss && chmod 755 /data /var/log/wechat-rss'
log_success "数据目录创建完成"

# ==========================================
# 阶段 2：项目部署
# ==========================================

log_info "开始项目部署..."

# 2.1 克隆或更新项目
log_info "处理项目代码..."

$SSH_CMD "
  if [ -d '$DEPLOY_PATH' ]; then
    echo '项目已存在，更新代码...'
    cd '$DEPLOY_PATH'
    git pull origin $GITHUB_BRANCH
  else
    echo '克隆新项目...'
    git clone -b $GITHUB_BRANCH '$GIT_REPO' '$DEPLOY_PATH'
  fi
"

log_success "项目代码处理完成"

# 2.2 安装依赖
log_info "安装 npm 依赖..."
$SSH_CMD "cd '$DEPLOY_PATH' && npm install --production"
log_success "npm 依赖安装完成"

# 2.3 复制 .env 文件
log_info "创建环境文件..."
$SSH_CMD "
  cd '$DEPLOY_PATH'
  if [ ! -f .env ]; then
    cp .env.production .env
    echo '环境文件创建成功'
  else
    echo '环境文件已存在'
  fi
"
log_success "环境文件处理完成"

# 2.4 创建日志目录
log_info "创建日志目录..."
$SSH_CMD "mkdir -p '$DEPLOY_PATH/logs' && chmod 755 '$DEPLOY_PATH/logs'"
log_success "日志目录创建完成"

# ==========================================
# 阶段 3：PM2 配置
# ==========================================

log_info "配置 PM2..."

$SSH_CMD "
  cd '$DEPLOY_PATH'

  # 删除之前的应用
  pm2 delete wechat-rss 2>/dev/null || true

  # 启动应用
  pm2 start ecosystem.config.js --env production

  # 设置开机自启
  pm2 startup systemd -u ubuntu --hp /home/ubuntu
  pm2 save
"

log_success "PM2 配置完成"

# ==========================================
# 阶段 4：Nginx 配置
# ==========================================

log_info "配置 Nginx..."

# 创建 Nginx 配置文件
$SSH_CMD "
  sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.bak

  sudo tee /etc/nginx/sites-available/default > /dev/null << 'NGINX_EOF'
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
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    proxy_buffering off;
    proxy_request_buffering off;
    proxy_cache_bypass \$http_upgrade;
  }

  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map)\$ {
    expires 30d;
    add_header Cache-Control \"public, immutable\";
    access_log off;
  }

  location ~ /\. {
    deny all;
    access_log off;
    log_not_found off;
  }
}
NGINX_EOF

  # 测试配置
  sudo nginx -t

  # 启动 Nginx
  sudo systemctl start nginx
  sudo systemctl enable nginx
"

log_success "Nginx 配置完成"

# ==========================================
# 阶段 5：验证部署
# ==========================================

log_info "验证部署..."

# 检查 PM2 应用状态
log_info "检查 PM2 应用状态..."
$SSH_CMD 'pm2 status'

# 检查服务可用性
log_info "检查服务可用性..."
sleep 2
if curl -s "http://$SERVER_IP/health" > /dev/null; then
  log_success "应用可访问"
else
  log_warn "应用暂未完全启动，请稍后访问"
fi

# ==========================================
# 完成部署
# ==========================================

echo ""
log_success "========== 部署完成 =========="
echo ""
log_info "访问应用：http://$SERVER_IP"
log_info "管理后台：http://$SERVER_IP/admin.html"
log_info "健康检查：http://$SERVER_IP/health"
log_info "查看日志：$SSH_CMD 'pm2 logs wechat-rss'"
log_info "重启应用：$SSH_CMD 'pm2 restart wechat-rss'"
echo ""
log_warn "请在生产环境中："
log_warn "1. 修改管理员密码"
log_warn "2. 配置 API 密钥（DEEPSEEK_API_KEY 或 ANTHROPIC_API_KEY）"
log_warn "3. 配置 SSL/TLS 证书"
log_warn "4. 设置防火墙规则"
echo ""
