# 腾讯云快速启动指南（5分钟版）

> 💡 简化版部署指南，适合有经验的开发者快速部署

**服务器：** 43.167.164.233（Ubuntu 24.04 LTS）

---

## 一句话总结

```bash
# 在本地机器执行此脚本，自动完成所有部署
chmod +x /Users/admin/VScode/wechat-rss-aggregator/deploy-to-tencent.sh
./deploy-to-tencent.sh
```

---

## 手动部署（如果不想用脚本）

### 1️⃣ 连接服务器并初始化（3分钟）

```bash
# 连接到服务器
ssh ubuntu@43.167.164.233

# 更新系统和安装工具
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs npm git nginx build-essential

# 安装 PM2
sudo npm install -g pm2
pm2 startup
pm2 save

# 创建数据目录
sudo mkdir -p /data /var/log/wechat-rss
sudo chown ubuntu:ubuntu /data /var/log/wechat-rss
```

### 2️⃣ 部署项目（2分钟）

```bash
# 进入用户主目录
cd /home/ubuntu

# 克隆项目
git clone https://github.com/your-username/wechat-rss-aggregator.git
cd wechat-rss-aggregator

# 安装依赖
npm install --production

# 设置环境文件
cp .env.production .env

# 创建日志目录
mkdir -p logs

# 启动应用
pm2 start ecosystem.config.js --env production
pm2 save
```

### 3️⃣ 配置 Nginx（1分钟）

```bash
# 复制配置文件模板
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.bak

# 编辑配置（使用脚本中的配置或参考 nginx.conf.example）
sudo nano /etc/nginx/sites-available/default

# 测试和启动
sudo nginx -t
sudo systemctl restart nginx
```

### 4️⃣ 验证（1分钟）

```bash
# 检查应用状态
pm2 status

# 测试访问
curl http://43.167.164.233/health
curl http://43.167.164.233/api/stats

# 在浏览器打开
# http://43.167.164.233/
```

---

## 常用命令速查

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs wechat-rss

# 重启应用
pm2 restart wechat-rss

# 检查 Nginx
sudo systemctl status nginx

# 重启 Nginx
sudo systemctl restart nginx

# 完整测试
curl http://43.167.164.233/ && echo "✅ 应用正常"
```

---

## 部署完成清单

- [ ] SSH 连接正常
- [ ] Node.js 版本 >= 18
- [ ] PM2 已安装并设置开机自启
- [ ] Nginx 已安装并启动
- [ ] `/data` 目录已创建并有写入权限
- [ ] 项目代码已克隆到 `/home/ubuntu/wechat-rss-aggregator`
- [ ] npm 依赖已安装
- [ ] 应用已通过 PM2 启动
- [ ] Nginx 反向代理已配置
- [ ] 访问 `http://43.167.164.233/` 正常显示

---

## 获取详细帮助

查看完整文档：[TENCENT_CLOUD_SETUP.md](./TENCENT_CLOUD_SETUP.md)

---

## 常见问题速解

| 问题 | 解决方案 |
|------|--------|
| 无法连接服务器 | 检查 SSH 密钥、安全组、IP 地址 |
| 应用启动失败 | `pm2 logs wechat-rss --err` 查看错误 |
| 访问 503 | `pm2 restart wechat-rss` 重启应用 |
| 数据库错误 | 检查 `/data` 目录权限：`chmod 755 /data` |
| WebSocket 失败 | 检查 Nginx 配置中的 Upgrade 和 Connection 头 |

---

**🎉 部署成功！**

访问：http://43.167.164.233/
管理后台：http://43.167.164.233/admin.html
