# 腾讯云部署完整清单

> 🎯 为腾讯云 43.167.164.233（Ubuntu 24.04 LTS）优化的完整部署清单

**准备时间：** 5 分钟
**部署时间：** 10-15 分钟
**总耗时：** 20-25 分钟

---

## 📋 一、代码改动清单

### ✅ 已完成的改动

#### 1. **核心代码改动**

- [x] **database.js** - 数据库路径智能配置
  - 支持 `DB_PATH` 环境变量
  - 自动选择最合适的存储路径
  - 自动创建目录

- [x] **rss-manager.js** - RSS 配置文件动态配置
  - 支持 `CONFIG_PATH` 环境变量
  - 自动选择最合适的配置路径
  - 自动创建目录

- [x] **server.js** - 日志系统和错误处理
  - 添加统一日志系统
  - 支持 `HOST` 和 `LOG_DIR` 环境变量
  - 添加优雅关闭处理（SIGTERM/SIGINT）
  - 添加未捕获异常处理

#### 2. **新增配置文件**

- [x] **.env.example** - 环境变量模板
  - 包含所有可配置项
  - 详细的注释说明
  - 腾讯云推荐配置

- [x] **.env.production** - 生产环境配置
  - 开箱即用的腾讯云配置
  - 无需手动编辑即可部署

- [x] **ecosystem.config.js** - PM2 生态系统配置
  - 集群模式（多进程）
  - 自动重启配置
  - 内存限制（500MB）
  - 开机自启配置

- [x] **nginx.conf.example** - Nginx 反向代理配置
  - WebSocket 完整支持
  - 静态文件缓存优化
  - 安全头配置
  - HTTPS 模板

#### 3. **自动化脚本**

- [x] **deploy-to-tencent.sh** - 一键部署脚本
  - 自动初始化云服务器
  - 自动安装所有依赖
  - 自动部署项目
  - 自动配置 PM2 和 Nginx
  - 自动验证部署

#### 4. **详细文档**

- [x] **TENCENT_CLOUD_SETUP.md** - 完整部署指南（8 个详细阶段）
- [x] **QUICK_START_TENCENT.md** - 快速启动指南（5 分钟版）
- [x] **CLOUD_ADAPTATION_SUMMARY.md** - 适配改动总结
- [x] **DEPLOYMENT_CHECKLIST.md** - 本文件

---

## 🚀 二、快速部署步骤

### 方案 A：自动化部署（推荐）

**耗时：** 10-15 分钟

```bash
# 第 1 步：在本地机器执行部署脚本
cd /Users/admin/VScode/wechat-rss-aggregator
chmod +x deploy-to-tencent.sh
./deploy-to-tencent.sh

# 脚本会自动完成所有部署工作
# 包括：初始化服务器、安装依赖、部署代码、配置 PM2、配置 Nginx
```

**部署完成后：**
```bash
# 访问应用
curl http://43.167.164.233/health
# 应返回：{"status":"ok","articlesCount":0,"lastCheck":"2026-02-26T..."}

# 在浏览器打开
# http://43.167.164.233/
# http://43.167.164.233/admin.html
```

### 方案 B：手动部署

**耗时：** 20-25 分钟

#### 第 1 步：SSH 连接（1 分钟）

```bash
ssh ubuntu@43.167.164.233
# 如果提示权限问题，使用密钥：
ssh -i ~/.ssh/id_rsa ubuntu@43.167.164.233
```

#### 第 2 步：初始化服务器（3 分钟）

```bash
sudo -i

# 更新系统
apt update && apt upgrade -y

# 安装基础工具
apt install -y curl wget git build-essential vim nginx

# 安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# 验证
node --version  # 应该 >= v18.0.0
npm --version
```

#### 第 3 步：安装 PM2（1 分钟）

```bash
npm install -g pm2
pm2 startup
pm2 save
```

#### 第 4 步：创建数据目录（1 分钟）

```bash
mkdir -p /data /var/log/wechat-rss
chown ubuntu:ubuntu /data /var/log/wechat-rss
chmod 755 /data /var/log/wechat-rss
```

#### 第 5 步：部署项目（3 分钟）

```bash
# 退出 root
exit

# 进入用户主目录
cd /home/ubuntu

# 克隆项目
git clone https://github.com/your-username/wechat-rss-aggregator.git
cd wechat-rss-aggregator

# 安装依赖
npm install --production

# 设置环境
cp .env.production .env

# 创建日志目录
mkdir -p logs
```

#### 第 6 步：启动应用（1 分钟）

```bash
# 启动应用
pm2 start ecosystem.config.js --env production

# 设置开机自启
pm2 startup
pm2 save

# 验证
pm2 status
# 应该看到 wechat-rss 状态为 "running"
```

#### 第 7 步：配置 Nginx（1 分钟）

```bash
# 备份原配置
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.bak

# 复制新配置
sudo cp /home/ubuntu/wechat-rss-aggregator/nginx.conf.example /etc/nginx/sites-available/default

# 测试
sudo nginx -t
# 应该显示 "ok"

# 启动 Nginx
sudo systemctl restart nginx
```

#### 第 8 步：验证部署（2 分钟）

```bash
# 查看应用状态
pm2 status

# 测试访问
curl http://127.0.0.1:3000/
curl http://127.0.0.1/health

# 在浏览器打开
# http://43.167.164.233/
```

---

## 📊 三、部署前检查清单

### 本地机器检查

- [ ] 有效的 SSH 密钥配置
- [ ] 能够访问腾讯云服务器（ping 43.167.164.233）
- [ ] 有 GitHub 仓库地址
- [ ] 了解项目 Git 分支（通常是 main）

### 腾讯云控制台检查

- [ ] 实例已启动
- [ ] 公网 IP：43.167.164.233
- [ ] 安全组已开放必要端口：
  - [ ] 22 (SSH)
  - [ ] 80 (HTTP)
  - [ ] 443 (HTTPS, 可选)

### 服务器配置检查

```bash
# 连接到服务器后检查
ssh ubuntu@43.167.164.233

# 检查系统版本
lsb_release -a
# 应该显示：Ubuntu 24.04 LTS

# 检查磁盘空间
df -h
# 应该有至少 5GB 可用空间

# 检查内存
free -h
# 应该有至少 1GB 内存

# 检查网络
ping www.baidu.com
# 应该能访问外网

# 检查 wget/curl
curl --version
wget --version

# 检查 git
git --version
```

---

## ✅ 四、部署完成验证清单

### 应用层面

- [ ] PM2 应用状态：`pm2 status` 显示 `running`
- [ ] 应用日志无错误：`pm2 logs wechat-rss --err` 无输出
- [ ] 数据库文件存在：`ls -la /data/articles.db`
- [ ] 配置文件存在：`ls -la /data/rss-config.json`

### 网络层面

- [ ] 健康检查正常：`curl http://43.167.164.233/health`
- [ ] 文章列表可获取：`curl http://43.167.164.233/api/articles`
- [ ] 管理后台可访问：`curl http://43.167.164.233/admin.html`
- [ ] Nginx 状态正常：`sudo systemctl status nginx`

### 功能层面

- [ ] 网站首页正常显示：http://43.167.164.233/
- [ ] 管理后台可登录：http://43.167.164.233/admin.html
- [ ] WebSocket 连接正常（检查浏览器控制台）
- [ ] 实时推送工作（添加新 RSS 源后有推送）

### 日志层面

- [ ] PM2 日志目录存在：`ls -la ~/wechat-rss-aggregator/logs/`
- [ ] Nginx 日志目录存在：`ls -la /var/log/nginx/`
- [ ] 应用日志目录存在：`ls -la /var/log/wechat-rss/`
- [ ] 无严重错误：`pm2 logs wechat-rss --err`

---

## 🔧 五、部署常见问题速解

| 问题 | 原因 | 解决方案 |
|------|------|--------|
| SSH 连接超时 | 网络问题、安全组限制 | 检查 IP、防火墙、安全组规则 |
| Permission denied | SSH 密钥权限不对 | `chmod 400 ~/.ssh/id_rsa` |
| 无法安装 Node.js | 源配置问题 | 手动添加 NodeSource 源 |
| 应用无法启动 | 端口被占用、权限问题 | 检查端口：`netstat -tlnp \| grep 3000` |
| 访问 503 | Nginx 反向代理失败 | 检查应用是否运行：`pm2 status` |
| 数据库错误 | 目录权限问题 | `chmod 755 /data` |
| WebSocket 失败 | Nginx 配置问题 | 检查是否有 Upgrade 和 Connection 头 |
| 内存持续增长 | 应用内存泄漏 | `pm2 restart wechat-rss` 或 `pm2 show wechat-rss` |

---

## 📚 六、相关文档导航

### 快速参考

- **快速启动**：[QUICK_START_TENCENT.md](./QUICK_START_TENCENT.md)
  - 适合有经验的开发者，5 分钟快速部署

- **完整指南**：[TENCENT_CLOUD_SETUP.md](./TENCENT_CLOUD_SETUP.md)
  - 详细的 8 个部署阶段，包含故障排查

- **改动总结**：[CLOUD_ADAPTATION_SUMMARY.md](./CLOUD_ADAPTATION_SUMMARY.md)
  - 所有代码改动和配置的详细说明

### 配置文件

- **环境变量模板**：[.env.example](./.env.example)
- **生产环境配置**：[.env.production](./.env.production)
- **PM2 配置**：[ecosystem.config.js](./ecosystem.config.js)
- **Nginx 配置模板**：[nginx.conf.example](./nginx.conf.example)

### 自动化工具

- **部署脚本**：[deploy-to-tencent.sh](./deploy-to-tencent.sh)
  - 一键自动化部署所有组件

---

## 🎯 七、后续优化建议

### 部署完成后立即做

1. **修改管理员密码**
   ```bash
   # 编辑 rss-manager.js 中的 DEFAULT_CONFIG.password
   nano /home/ubuntu/wechat-rss-aggregator/rss-manager.js

   # 修改这一行：
   # password: 'admin123'  => password: 'your-strong-password'

   # 重启应用
   pm2 restart wechat-rss
   ```

2. **配置 AI 摘要 API（可选）**
   ```bash
   nano /home/ubuntu/wechat-rss-aggregator/.env

   # 添加以下行之一：
   # DEEPSEEK_API_KEY=sk-xxx...  (推荐，成本低)
   # ANTHROPIC_API_KEY=sk-ant-xxx...

   # 重启应用
   pm2 restart wechat-rss
   ```

3. **设置自动备份**
   ```bash
   crontab -e
   # 添加以下行（每天凌晨3点备份）：
   # 0 3 * * * tar -czf /home/ubuntu/backups/backup-$(date +\%Y\%m\%d).tar.gz /data
   ```

### 一周内完成

1. **配置 HTTPS/SSL**
   - 申请免费 SSL 证书（Let's Encrypt）
   - 更新 Nginx 配置启用 HTTPS
   - 301 重定向 HTTP 到 HTTPS

2. **性能优化**
   - 启用 Gzip 压缩
   - 优化数据库查询
   - 考虑添加缓存

3. **安全加固**
   - 启用防火墙
   - 配置 API 速率限制
   - 定期检查日志

### 长期改进

1. **容器化**
   - 编写 Dockerfile
   - 使用 Docker Compose
   - 考虑 Kubernetes 部署

2. **监控告警**
   - 集成 PM2 Plus（收费）
   - 自定义告警规则
   - 定期性能审计

3. **扩展性**
   - 考虑使用 PostgreSQL 替代 SQLite
   - 添加 Redis 缓存
   - 实现负载均衡

---

## 🎉 八、成功标志

部署完全成功时你将看到：

```bash
# 1. PM2 状态
$ pm2 status
id  │ name       │ namespace │ version │ mode    │ pid      │ uptime  │ ↺ │ status    │ cpu │ memory
──  │ wechat-rss │ default   │ 1.0.0   │ cluster │ multiple │ 10m    │ 0 │ running   │ 1%  │ 50M

# 2. 健康检查
$ curl http://43.167.164.233/health
{"status":"ok","articlesCount":125,"lastCheck":"2026-02-26T12:34:56.789Z"}

# 3. 浏览器访问
✅ http://43.167.164.233/          - 首页正常
✅ http://43.167.164.233/admin.html - 管理后台正常
✅ http://43.167.164.233/health     - 健康检查正常

# 4. 数据和日志
✅ /data/articles.db - 数据库存在
✅ /data/rss-config.json - 配置存在
✅ /var/log/wechat-rss/ - 日志生成
```

---

## 📞 需要帮助？

### 快速排查步骤

```bash
# 1. 检查应用是否运行
pm2 status

# 2. 查看应用错误
pm2 logs wechat-rss --err

# 3. 检查 Nginx 是否运行
sudo systemctl status nginx

# 4. 查看 Nginx 错误
sudo tail -f /var/log/nginx/wechat-rss-error.log

# 5. 测试应用响应
curl -v http://127.0.0.1:3000/

# 6. 完整系统检查
# 参考：TENCENT_CLOUD_SETUP.md 的 "常见问题解决" 部分
```

---

**🎊 祝贺！你已准备好在腾讯云上部署应用了！**

**建议按照以下顺序进行：**

1. ✅ 阅读本文件（2分钟）
2. ✅ 阅读快速启动指南 - QUICK_START_TENCENT.md（3分钟）
3. ✅ 执行部署脚本或手动部署（10-25分钟）
4. ✅ 验证部署（5分钟）
5. ✅ 根据需要阅读完整指南进行调整和优化

**总耗时：20-40分钟**

如有任何问题，参考：[TENCENT_CLOUD_SETUP.md](./TENCENT_CLOUD_SETUP.md) 的"常见问题解决"部分

---

**最后更新：** 2026-02-26
**部署目标：** 腾讯云 43.167.164.233
**系统：** Ubuntu Server 24.04 LTS 64bit
