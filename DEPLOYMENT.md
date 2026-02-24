# 📦 项目部署完整指南

## 🎯 方案选择

### 方案A：VSCode + GitHub（推荐）✅
**适合：** 有Git基础，希望版本控制  
**优点：** 专业、可回滚、团队协作  
**时间：** 5分钟

### 方案B：GitHub Web界面
**适合：** 不熟悉Git命令  
**优点：** 简单直观  
**时间：** 10分钟

### 方案C：Railway直接部署
**适合：** 快速测试  
**优点：** 最快上线  
**时间：** 3分钟

---

## 🚀 方案A：VSCode + GitHub（最推荐）

### 步骤1：下载项目包

从Claude下载 `wechat-rss-aggregator-complete` 文件夹

### 步骤2：初始化Git仓库

```bash
# 1. 用VSCode打开项目文件夹
# File -> Open Folder -> 选择 wechat-rss-aggregator-complete

# 2. 打开VSCode集成终端
# Terminal -> New Terminal (或 Ctrl+`)

# 3. 初始化Git（如果还没有）
git init

# 4. 添加所有文件
git add .

# 5. 创建第一次提交
git commit -m "Initial commit: 完整RSS聚合系统 + AI摘要功能"
```

### 步骤3：关联GitHub仓库

#### 如果还没有GitHub仓库：

```bash
# 1. 在GitHub创建新仓库
# 访问 https://github.com/new
# 仓库名：wechat-rss-aggregator
# 类型：Public
# 不要勾选任何初始化文件

# 2. 关联远程仓库（替换YOUR_USERNAME）
git remote add origin https://github.com/YOUR_USERNAME/wechat-rss-aggregator.git

# 3. 推送代码
git branch -M main
git push -u origin main
```

#### 如果已有GitHub仓库：

```bash
# 1. 先备份当前线上代码（可选）
git pull origin main --allow-unrelated-histories

# 2. 强制推送新代码（覆盖旧版本）
git push -f origin main

# 或者：合并推送（保留历史）
git push origin main
```

### 步骤4：配置Railway

```bash
# Railway会自动检测GitHub更新并重新部署
# 无需手动操作，等待3-5分钟
```

### 步骤5：配置环境变量

Railway仪表板 → Settings → Variables → 添加：

```
ANTHROPIC_API_KEY=sk-ant-api03-xxx...
```

### 步骤6：验证部署

访问Railway提供的URL，检查：
- [ ] 主页正常显示
- [ ] 文章列表加载成功
- [ ] 点击文章标题进入摘要页
- [ ] 摘要页显示AI生成的内容
- [ ] "阅读原文"按钮正常跳转

---

## 📱 方案B：GitHub Web界面

### 步骤1：准备文件

下载 `wechat-rss-aggregator-complete` 文件夹到本地

### 步骤2：访问GitHub仓库

```
https://github.com/YOUR_USERNAME/wechat-rss-aggregator
```

### 步骤3：上传文件

#### 方法1：拖拽上传（适合新仓库）

```
1. 点击 "Add file" -> "Upload files"
2. 拖拽整个项目文件夹
3. 填写提交信息："Update: 添加AI摘要功能"
4. 点击 "Commit changes"
```

#### 方法2：逐个替换（适合已有仓库）

```
# 替换以下文件：
1. server.js
2. fetcher.js
3. database.js
4. package.json
5. public/app.js
6. public/summary.html

# 新增以下文件：
1. summarizer.js
2. .gitignore
3. .env.example
```

### 步骤4：Railway自动部署

等待3-5分钟，Railway自动检测更新并部署

### 步骤5：配置环境变量

同方案A步骤5

---

## ⚡ 方案C：Railway直接部署

### 适用场景

- 测试功能
- 快速演示
- 个人使用

### 步骤

```bash
# 1. 安装Railway CLI
npm install -g @railway/cli

# 2. 登录Railway
railway login

# 3. 进入项目目录
cd wechat-rss-aggregator-complete

# 4. 部署
railway up

# 5. 配置环境变量
railway variables set ANTHROPIC_API_KEY=sk-ant-xxx...

# 6. 获取URL
railway domain
```

---

## 🔧 常见问题排查

### 问题1：文章点击后404

**原因：** summary.html未上传或路径错误  
**解决：**
```bash
# 检查文件是否存在
ls public/summary.html

# 如果不存在，从下载包中复制
cp path/to/download/public/summary.html public/
```

### 问题2：摘要未生成

**原因：** 未配置API Key  
**解决：**
```bash
# Railway仪表板设置环境变量
ANTHROPIC_API_KEY=sk-ant-xxx...

# 重启服务
railway restart
```

### 问题3：Railway构建失败

**原因：** 缺少依赖  
**解决：**
```bash
# 检查package.json是否包含cheerio
cat package.json | grep cheerio

# 如果没有，手动添加
npm install cheerio
git add package.json package-lock.json
git commit -m "Add cheerio dependency"
git push
```

### 问题4：数据库字段缺失

**原因：** 数据库未升级  
**解决：**

Railway会自动运行database.js中的迁移代码，但如果有问题：

```bash
# 方案1：删除旧数据库（重新开始）
# Railway仪表板 -> Data -> Delete articles.db

# 方案2：手动迁移
sqlite3 articles.db
ALTER TABLE articles ADD COLUMN summary TEXT;
ALTER TABLE articles ADD COLUMN summary_generated_at DATETIME;
```

### 问题5：VSCode无法推送

**错误：** Permission denied (publickey)  
**解决：**

```bash
# 使用HTTPS而非SSH
git remote set-url origin https://github.com/YOUR_USERNAME/wechat-rss-aggregator.git

# 或者配置SSH密钥
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub
# 复制输出，添加到GitHub: Settings -> SSH Keys
```

---

## 📋 部署检查清单

### 文件完整性

- [ ] server.js（已添加摘要API）
- [ ] fetcher.js（已添加自动生成摘要）
- [ ] summarizer.js（新文件）
- [ ] database.js（已添加摘要字段）
- [ ] package.json（已添加cheerio依赖）
- [ ] public/app.js（已修改点击逻辑）
- [ ] public/summary.html（新文件）
- [ ] README.md
- [ ] .gitignore
- [ ] .env.example

### 功能验证

- [ ] 主页文章列表加载正常
- [ ] 点击文章标题跳转到 /summary.html?id=123
- [ ] 摘要页显示文章信息
- [ ] 摘要内容正确显示（或显示"正在生成中"）
- [ ] "阅读原文"按钮跳转正常
- [ ] 后台管理(/admin.html)正常访问
- [ ] WebSocket实时推送工作正常

### 性能检查

- [ ] 首页加载时间 < 2秒
- [ ] 摘要页加载时间 < 1秒
- [ ] 新文章自动推送延迟 < 5秒
- [ ] API响应时间 < 500ms

---

## 🎉 部署成功后

### 1. 测试AI摘要功能

```bash
# 等待下一次RSS抓取（最多15分钟）
# 或手动触发抓取

curl -X POST https://your-app.railway.app/api/fetch
```

### 2. 监控API使用量

访问 Anthropic Console → Usage → 查看token消费

### 3. 优化成本（可选）

如果API成本过高：

```javascript
// 在fetcher.js中添加条件
if (feed.name === '量子位' || feed.name === '机器之心') {
  // 只为重要源生成摘要
  await generateSummary(...);
}
```

### 4. 分享你的网站

```
https://your-app.railway.app
```

---

## 📞 获取帮助

### Railway日志查看

```bash
# CLI方式
railway logs

# Web方式
Railway仪表板 -> Deployments -> View Logs
```

### GitHub Issues

如遇问题，在GitHub仓库创建Issue，提供：
1. 错误信息截图
2. Railway日志
3. 浏览器控制台错误

---

## 🔄 后续更新

### 添加新RSS源

```bash
# 1. 编辑 rss-manager.js
# 2. 添加新源配置
# 3. 提交并推送

git add rss-manager.js
git commit -m "Add new RSS source: XXX"
git push
```

### 修改摘要提示词

```bash
# 1. 编辑 summarizer.js
# 2. 修改 callClaudeAPI 函数中的 prompt
# 3. 提交并推送

git add summarizer.js
git commit -m "Update summary prompt"
git push
```

### 禁用AI摘要

```bash
# Railway仪表板
# Settings -> Variables -> 删除 ANTHROPIC_API_KEY

# 或在代码中注释掉自动生成逻辑
# fetcher.js 第73-90行
```

---

**祝部署顺利！有问题随时问我。** 🚀
