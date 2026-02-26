# 微信公众号文章聚合系统

一个简洁现代的微信公众号文章聚合平台，支持自动抓取、展示和搜索文章。

## ✨ 功能特性

- ⏰ **自动抓取**：每小时自动抓取最新文章
- 🔍 **搜索功能**：支持标题和内容搜索
- 📱 **响应式设计**：完美适配手机和电脑
- 🎨 **简约现代**：白色背景 + 蓝色主色调
- 💾 **数据持久化**：使用SQLite数据库存储
- 🚀 **一键部署**：支持Railway平台快速部署

## 📋 技术栈

**后端：**
- Node.js + Express
- SQLite 数据库
- node-cron 定时任务
- rss-parser RSS解析

**前端：**
- 原生 HTML/CSS/JavaScript
- 现代化响应式设计
- 无需任何框架打包

## 🚀 快速开始

### 方式一：本地运行（用于测试）

#### 1. 安装 Node.js

确保您的电脑已安装 Node.js（18.0+）：
```bash
node --version
```

如果未安装，请访问 https://nodejs.org/ 下载安装。

#### 2. 下载项目代码

将项目文件夹下载到您的电脑。

#### 3. 安装依赖

打开终端（Windows用户打开命令提示符或PowerShell），进入项目文件夹：

```bash
cd wechat-rss-aggregator
npm install
```

#### 4. 配置RSS源

编辑 `fetcher.js` 文件，修改 `RSS_FEEDS` 数组：

```javascript
const RSS_FEEDS = [
  {
    name: '您的公众号名称',
    url: 'https://your-rss-feed-url.com/feed', // 替换为实际RSS地址
  },
  // 添加更多RSS源...
];
```

**获取RSS源的方法：**
- 使用 RSSHub：https://docs.rsshub.app/
- 使用 we-mp-rss 服务
- 其他RSS生成服务

#### 5. 启动服务器

```bash
npm start
```

#### 6. 访问网站

打开浏览器，访问：http://localhost:3000

您应该能看到网站界面！

### 方式二：部署到 Railway（推荐）

#### 步骤1：创建 GitHub 仓库

1. 访问 https://github.com/ 并登录
2. 点击右上角 "+" → "New repository"
3. 填写仓库名称，例如：`wechat-rss-aggregator`
4. 选择 "Public" 或 "Private"
5. 点击 "Create repository"

#### 步骤2：上传代码到 GitHub

**如果您会用 Git：**

```bash
cd wechat-rss-aggregator
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/您的用户名/wechat-rss-aggregator.git
git push -u origin main
```

**如果您不会用 Git（简单方法）：**

1. 访问您刚创建的 GitHub 仓库页面
2. 点击 "uploading an existing file"
3. 将项目文件夹内的**所有文件**拖入浏览器窗口
4. 滚动到底部，点击 "Commit changes"

#### 步骤3：部署到 Railway

1. **注册 Railway**
   - 访问 https://railway.app/
   - 点击 "Login" 或 "Start a New Project"
   - 使用 GitHub 账号登录（推荐）

2. **创建新项目**
   - 登录后，点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 选择您刚创建的仓库：`wechat-rss-aggregator`

3. **等待部署**
   - Railway 会自动检测并部署您的项目
   - 等待 3-5 分钟，状态变为 "Active"

4. **生成公开链接**
   - 点击您的项目
   - 点击 "Settings"
   - 找到 "Domains" 部分
   - 点击 "Generate Domain"
   - 复制生成的网址（格式：https://xxx.railway.app）

5. **访问您的网站**
   - 打开刚才复制的网址
   - 您的网站已经在线运行了！🎉

#### 步骤4：配置RSS源（重要）

在 Railway 上部署后，您需要配置实际的RSS源：

1. 在 GitHub 仓库中编辑 `fetcher.js`
2. 修改 `RSS_FEEDS` 数组，添加真实的RSS链接
3. 提交更改
4. Railway 会自动重新部署（约2-3分钟）

## 🔧 配置说明

### RSS 源配置

编辑 `fetcher.js` 文件：

```javascript
const RSS_FEEDS = [
  {
    name: '公众号1',
    url: 'https://rsshub.app/wechat/mp/articles/公众号ID',
  },
  {
    name: '公众号2',
    url: 'https://your-rss-service.com/feed',
  }
];
```

### 抓取频率调整

默认每小时抓取一次。如需修改，编辑 `server.js`：

```javascript
// 每小时抓取：'0 * * * *'
// 每30分钟抓取：'*/30 * * * *'
// 每天早上8点抓取：'0 8 * * *'
cron.schedule('0 * * * *', async () => {
  // 抓取逻辑
});
```

## 📊 查看日志

### 本地查看

运行 `npm start` 后，终端会显示日志：

```
🚀 服务器运行在 http://localhost:3000
⏰ 定时任务已设置：每小时抓取一次文章
✅ 初始数据加载完成
```

### Railway 查看

1. 登录 Railway
2. 点击您的项目
3. 点击 "Deployments"
4. 选择最新的部署
5. 点击 "View Logs"

您会看到详细的运行日志。

## 🐛 故障排查

### 问题1：Railway 部署失败

**查看错误：**
1. Railway → Deployments → 点击失败的部署 → View Logs

**常见原因：**
- 缺少 `package.json`：确保文件已上传
- Node.js 版本不兼容：确保 `package.json` 中 `engines.node` 为 `>=18.0.0`

**解决方法：**
- 检查所有文件是否都上传到了 GitHub
- 确保 `package.json` 格式正确

### 问题2：网站能访问，但没有文章

**原因：** RSS源配置不正确或RSS服务不可用

**解决方法：**
1. 检查 `fetcher.js` 中的 RSS 链接是否正确
2. 在浏览器中直接访问RSS链接，看是否能打开
3. 查看 Railway 日志，搜索 "抓取" 相关信息

### 问题3：手动刷新不工作

**查看浏览器控制台：**
- 按 F12 打开开发者工具
- 切换到 "Console" 标签
- 点击网站上的"刷新"按钮
- 查看是否有错误信息

### 问题4：本地运行报错 "Cannot find module"

**解决方法：**
```bash
# 删除 node_modules 文件夹
rm -rf node_modules

# 重新安装
npm install
```

## 📞 获取帮助

遇到问题？请检查：

1. **Railway 日志**：查看详细错误信息
2. **浏览器控制台**（F12）：查看前端错误
3. **RSS 链接**：确保RSS源可访问

## 🎨 自定义样式

所有样式都在 `public/styles.css` 中。

**修改主题颜色：**

```css
:root {
  --primary-color: #2563eb;  /* 改为您喜欢的颜色 */
  --primary-hover: #1d4ed8;
}
```

**常用颜色代码：**
- 蓝色：`#2563eb`（默认）
- 绿色：`#10b981`
- 紫色：`#8b5cf6`
- 橙色：`#f59e0b`
- 红色：`#ef4444`

修改后，提交到 GitHub，Railway 会自动更新。

## 📈 性能优化

### 数据库清理

文章会持续累积，定期清理旧文章：

1. 在 Railway 中打开 Terminal（Beta功能）
2. 或下载数据库文件到本地

执行SQL：
```sql
-- 删除30天前的文章
DELETE FROM articles WHERE createdAt < datetime('now', '-30 days');
```

### 限制抓取数量

在 `fetcher.js` 中限制每次抓取的文章数：

```javascript
const feedData = await parser.parseURL(feed.url);
const items = feedData.items.slice(0, 10); // 只取前10篇

for (const item of items) {
  // ...
}
```

## 🔒 安全建议

1. **不要暴露敏感信息**：不要在代码中硬编码API密钥
2. **使用环境变量**：敏感配置使用 Railway 的环境变量功能
3. **定期更新依赖**：运行 `npm update` 更新依赖包

## 📝 更新日志

### v1.0.0 (2026-02-08)
- ✅ 初始版本发布
- ✅ 支持每小时自动抓取
- ✅ 简约现代UI设计
- ✅ 搜索和分页功能
- ✅ Railway一键部署

## 📄 开源协议

MIT License - 可自由使用和修改

---

## 🎉 完成！

恭喜！您已成功部署微信公众号文章聚合系统。

**下一步：**
1. ✅ 配置真实的RSS源
2. ✅ 自定义主题颜色（可选）
3. ✅ 分享您的网站链接

**需要帮助？** 
- 查看 Railway 部署日志
- 检查浏览器控制台（F12）
- 回到对话向我提问

祝使用愉快！🚀
