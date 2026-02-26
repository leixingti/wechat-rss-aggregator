# 云服务器适配改动总结

本文档总结了为适配腾讯云 43.167.164.233（Ubuntu 24.04 LTS）所做的所有代码改动和配置。

---

## 📋 改动清单

### A. 代码改动

#### 1. **database.js** - 数据库路径动态配置

**改动内容：**
- 添加智能数据库路径选择逻辑
- 支持 `DB_PATH` 环境变量
- 优先级：环境变量 > `/app/data` > `/data` > `~/.wechat-rss` > 项目目录
- 自动创建数据库目录
- 添加日志记录数据库路径

**好处：**
- ✅ 支持 Docker、Kubernetes 等容器化部署
- ✅ 云服务器持久化数据存储
- ✅ 本地开发和生产环境无缝切换

**验证：**
```bash
# 应该在 server 启动时看到：
# 📍 数据库路径: /data/articles.db
```

---

#### 2. **rss-manager.js** - RSS 配置文件动态配置

**改动内容：**
- 添加智能配置目录选择逻辑
- 支持 `CONFIG_PATH` 环境变量
- 优先级：环境变量 > `/app/data` > `/data` > `~/.wechat-rss` > 项目目录
- 自动创建配置目录
- 添加日志记录配置路径

**好处：**
- ✅ RSS 配置在云服务器中持久化
- ✅ 支持动态修改 RSS 源而不丢失配置
- ✅ 容易备份和恢复

**验证：**
```bash
# 应该看到：
# 📍 RSS配置路径: /data/rss-config.json
```

---

#### 3. **server.js** - 完善日志和错误处理

**改动内容：**
- 添加环境变量加载 (`dotenv`)
- 创建统一的日志系统（`log` 对象）
- 支持 `HOST` 环境变量（默认 0.0.0.0）
- 支持 `LOG_DIR` 环境变量
- 添加优雅关闭处理 (SIGTERM, SIGINT)
- 添加未捕获异常处理
- 改进服务器启动日志

**改动代码示例：**

```javascript
// 日志系统
const log = {
  info: (msg) => console.log(`[${new Date().toISOString()}] ℹ️  ${msg}`),
  success: (msg) => console.log(`[${new Date().toISOString()}] ✅ ${msg}`),
  warn: (msg) => console.warn(`[${new Date().toISOString()}] ⚠️  ${msg}`),
  error: (msg, err) => console.error(`[${new Date().toISOString()}] ❌ ${msg}`, err ? err.message : '')
};

// 优雅关闭
process.on('SIGTERM', () => {
  log.warn('收到 SIGTERM 信号，开始优雅关闭...');
  server.close(() => {
    log.success('HTTP 服务器已关闭');
    db.close(() => {
      log.success('数据库连接已关闭');
      process.exit(0);
    });
  });
});
```

**好处：**
- ✅ 云服务器日志更清晰，易于调试
- ✅ PM2 重启时优雅关闭，不丢失数据
- ✅ 容器化部署时的信号处理正确
- ✅ 异常捕获，提高应用稳定性

**验证：**
```bash
# 启动应用时应该看到：
# ==== 应用启动 ====
# Node.js 版本: v18.x.x
# 环境: production
# 日志目录: /var/log/wechat-rss
# 监听地址: 0.0.0.0:3000
```

---

### B. 新增配置文件

#### 1. **.env.example** - 环境变量模板

**文件位置：** `/.env.example`

**包含内容：**
- 应用核心配置（PORT、HOST、NODE_ENV）
- 数据库配置（DB_PATH）
- RSS 配置（CONFIG_PATH）
- 日志配置（LOG_DIR、LOG_LEVEL）
- AI 摘要 API 密钥（可选）
- 国际化和翻译（可选）
- 监控和性能配置
- 云平台特定配置
- 安全配置

**使用方法：**
```bash
# 复制模板为实际配置文件
cp .env.example .env
nano .env
```

---

#### 2. **.env.production** - 生产环境配置

**文件位置：** `/.env.production`

**包含内容：**
- 腾讯云专用配置
- 生产环境推荐路径
- 安装前准备清单

**特点：**
- ✅ 开箱即用
- ✅ 无需手工编辑即可部署
- ✅ 注释清晰，便于后期定制

---

#### 3. **ecosystem.config.js** - PM2 生态系统配置

**文件位置：** `/ecosystem.config.js`

**配置项：**
- 应用名称：`wechat-rss`
- 运行模式：集群模式（`max` 实例数）
- 内存限制：500MB（超过则自动重启）
- 日志配置：合并日志，日期格式
- 文件监听：关闭（生产环境）
- 优雅关闭：5000ms 超时
- 开机自启：systemd 管理
- 部署配置：支持远程部署

**使用方法：**
```bash
# 启动应用
pm2 start ecosystem.config.js --env production

# 查看状态
pm2 status

# 查看日志
pm2 logs wechat-rss

# 开机自启
pm2 startup systemd -u ubuntu --hp /home/ubuntu
pm2 save
```

**好处：**
- ✅ 自动多进程部署（充分利用多核 CPU）
- ✅ 自动重启挂起的进程
- ✅ 内存溢出自动重启
- ✅ 开机自启，无需手工干预

---

#### 4. **nginx.conf.example** - Nginx 反向代理配置

**文件位置：** `/nginx.conf.example`

**特点：**
- 完整的注释说明
- WebSocket 支持
- 静态文件缓存优化
- 安全头配置
- HTTPS 配置模板（可选）
- 敏感文件保护

**主要配置：**
```nginx
# WebSocket 支持
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';

# 请求头转发
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;

# 超时配置
proxy_connect_timeout 60s;
proxy_read_timeout 60s;

# WebSocket 需要禁用缓冲
proxy_buffering off;
proxy_request_buffering off;
```

**安装方法：**
```bash
# 复制到 Nginx 配置目录
sudo cp nginx.conf.example /etc/nginx/sites-available/wechat-rss

# 或替换默认配置
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.bak
sudo cp nginx.conf.example /etc/nginx/sites-available/default

# 测试和启动
sudo nginx -t
sudo systemctl restart nginx
```

---

#### 5. **deploy-to-tencent.sh** - 自动化部署脚本

**文件位置：** `/deploy-to-tencent.sh`

**功能：**
- 一键初始化云服务器环境
- 自动安装所有依赖
- 自动部署项目代码
- 自动配置 PM2 和 Nginx
- 自动验证部署结果

**使用方法：**
```bash
# 在本地机器上执行
chmod +x deploy-to-tencent.sh
./deploy-to-tencent.sh
```

**脚本流程：**
1. 前置检查（SSH 密钥、网络连接）
2. 云服务器初始化（系统更新、工具安装）
3. 项目代码部署（克隆/更新、依赖安装）
4. PM2 配置（启动应用、开机自启）
5. Nginx 配置（反向代理、重启）
6. 部署验证（检查状态、测试访问）

**时间耗时：** 约 10-15 分钟

---

### C. 部署文档

#### 1. **TENCENT_CLOUD_SETUP.md** - 完整部署指南

**内容：**
- 8 个详细部署阶段
- 每个步骤的完整命令
- 常见问题解决方案
- 日常维护和监控
- 快速参考表

**适合：** 需要详细了解每个步骤的开发者

---

#### 2. **QUICK_START_TENCENT.md** - 快速启动指南

**内容：**
- 5 分钟快速部署
- 手动部署步骤（4 个部分）
- 常用命令速查
- 部署完成清单
- 常见问题速解

**适合：** 有经验、需要快速部署的开发者

---

## 📊 环境适配对比表

| 配置项 | 本地开发 | 腾讯云生产 | 说明 |
|--------|--------|----------|------|
| PORT | 3000 | 3000 | 内部端口（Nginx 反向代理）|
| HOST | localhost | 0.0.0.0 | 允许外部访问 |
| NODE_ENV | development | production | 生产优化 |
| DB_PATH | 项目目录 | /data/articles.db | 持久化存储 |
| CONFIG_PATH | 项目目录 | /data | 配置持久化 |
| LOG_DIR | ./logs | /var/log/wechat-rss | 日志持久化 |
| 进程数 | 1 | max（自动） | 充分利用多核 |
| 内存限制 | 无 | 500M | 防止内存溢出 |
| 监听文件 | true | false | 生产环境关闭 |
| 自动重启 | × | ✓ | PM2 管理 |
| 开机自启 | × | ✓ | systemd 管理 |

---

## 🔧 配置优先级

### 数据库路径 (`DB_PATH`)

```
环境变量 DB_PATH
    ↓
/app/data (Docker/K8s)
    ↓
/data (云服务器推荐)
    ↓
~/.wechat-rss (用户主目录)
    ↓
项目目录 (本地开发)
```

### 配置路径 (`CONFIG_PATH`)

同上

### 日志目录 (`LOG_DIR`)

```
环境变量 LOG_DIR
    ↓
~/.wechat-rss/logs
    ↓
./logs (项目目录)
```

---

## ✅ 兼容性检查表

| 项目 | 状态 | 说明 |
|------|------|------|
| Node.js >= 18.0.0 | ✅ | 已支持 |
| WebSocket | ✅ | Nginx 已配置 |
| 数据持久化 | ✅ | /data 目录 |
| 进程管理 | ✅ | PM2 cluster 模式 |
| 日志记录 | ✅ | 统一日志系统 |
| 错误处理 | ✅ | 优雅关闭、异常捕获 |
| 环境变量 | ✅ | dotenv 支持 |
| Docker | ✅ | 兼容（/app/data 支持）|
| Kubernetes | ✅ | 兼容（环境变量支持）|
| 负载均衡 | ✅ | PM2 cluster + Nginx |

---

## 📝 快速检查清单

### 部署前

- [ ] 服务器 IP：43.167.164.233
- [ ] 操作系统：Ubuntu 24.04 LTS
- [ ] SSH 密钥已配置
- [ ] 安全组已开放 22/80/443 端口
- [ ] 有 GitHub 仓库地址
- [ ] 知道项目 Git 分支（main/develop）

### 部署中

- [ ] Node.js 版本 >= 18
- [ ] npm 依赖已安装
- [ ] .env 文件已创建
- [ ] /data 目录权限正确
- [ ] 应用通过 PM2 启动
- [ ] Nginx 反向代理已配置
- [ ] 防火墙规则已更新

### 部署后

- [ ] `pm2 status` 显示 running
- [ ] `curl http://43.167.164.233/health` 返回 200
- [ ] `/admin.html` 可访问
- [ ] WebSocket 连接正常
- [ ] `/data/articles.db` 文件存在
- [ ] 日志文件在 `/var/log/wechat-rss` 中

---

## 🚀 后续优化建议

### 短期（一周内）

1. **配置 HTTPS**
   - 申请免费 SSL 证书（Let's Encrypt）
   - 修改 Nginx 配置启用 HTTPS

2. **优化性能**
   - 启用 Gzip 压缩
   - 配置 CDN（可选）
   - 监控应用性能

3. **安全加固**
   - 修改管理员密码
   - 配置 API 速率限制
   - 启用 CORS 白名单

### 中期（一个月内）

1. **数据库优化**
   - 分析 SQLite 查询性能
   - 添加数据库索引
   - 定期备份

2. **监控告警**
   - 集成 PM2 Plus（可选）
   - 配置错误告警
   - 定期检查日志

3. **容器化改进**
   - 考虑使用 Docker（便于扩展）
   - 编写 Dockerfile
   - 配置 docker-compose

---

## 📚 相关文档链接

- [完整部署指南](./TENCENT_CLOUD_SETUP.md)
- [快速启动指南](./QUICK_START_TENCENT.md)
- [自动化部署脚本](./deploy-to-tencent.sh)
- [Nginx 配置模板](./nginx.conf.example)
- [PM2 生态系统配置](./ecosystem.config.js)
- [环境变量模板](../.env.example)

---

## 🎯 成功标志

部署成功的标志：

✅ 应用在 PM2 中正常运行
✅ 浏览器可访问 http://43.167.164.233/
✅ `/health` 端点返回正常状态
✅ 数据库文件在 `/data/articles.db` 中
✅ 日志在 `/var/log/wechat-rss` 中正常生成
✅ WebSocket 连接正常（实时推送工作）
✅ 管理后台可访问

---

**最后更新：** 2026-02-26
**部署目标：** 腾讯云 43.167.164.233
**操作系统：** Ubuntu Server 24.04 LTS
