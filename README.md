# 🚀 IT行业动态聚合平台

全功能RSS新闻聚合系统，集成AI自动摘要、实时推送、智能翻译等功能。

## ✨ 核心功能

### 1. 📰 多源RSS聚合
- ✅ 30+优质RSS源（18个中文 + 12个国际）
- ✅ 自动分类（AI行业新闻 / IT行业动态 / AI会议）
- ✅ 每15分钟自动抓取
- ✅ WebSocket实时推送

### 2. 🤖 AI智能摘要
- ✅ Claude Sonnet 4自动生成800-1000字摘要
- ✅ 提炼核心观点、关键数据、影响分析
- ✅ 精美摘要详情页（渐变紫色设计）
- ✅ 智能抓取完整文章（RSS内容不足时）

### 3. 🌍 AI翻译（可选）
- ✅ 自动识别中英文内容
- ✅ 标题翻译（节省成本）
- ✅ 支持国际AI公司新闻

### 4. 📊 6大展示板块
- **聚焦AI行业** - AI新闻与技术动态
- **IT行业新闻** - 科技行业综合资讯
- **AI行业会议** - 全球AI会议日历
- **AI大模型厂商** - 全球TOP50大模型公司
- **旗舰AI 100** - 量子位智库年度榜单
- **创新AI 100** - 2026年潜力产品

## 🎯 快速开始

### 本地开发

```bash
# 1. 克隆项目
git clone https://github.com/你的用户名/wechat-rss-aggregator.git
cd wechat-rss-aggregator

# 2. 安装依赖
npm install

# 3. 配置环境变量（可选）
# 创建 .env 文件
echo "ANTHROPIC_API_KEY=sk-ant-xxx..." > .env

# 4. 启动项目
npm start

# 5. 访问应用
# 浏览器打开 http://localhost:3000
```

### Railway部署

1. **连接GitHub仓库**
   - 访问 https://railway.app
   - 点击 "New Project" → "Deploy from GitHub repo"
   - 选择此仓库

2. **配置环境变量**（可选，启用AI摘要需要）
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-xxx...
   ```

3. **自动部署**
   - Railway自动检测配置并部署
   - 3-5分钟后即可访问

## 📁 项目结构

```
wechat-rss-aggregator/
├── public/                # 前端文件
│   ├── index.html        # 主页
│   ├── summary.html      # AI摘要详情页
│   ├── admin.html        # RSS管理后台
│   ├── app.js            # 前端核心逻辑
│   └── styles.css        # 样式文件
├── server.js             # Express服务器
├── fetcher.js            # RSS抓取模块
├── summarizer.js         # AI摘要生成器
├── translator.js         # AI翻译模块（可选）
├── database.js           # SQLite数据库
├── rss-manager.js        # RSS源管理
├── conferences.js        # AI会议数据
├── package.json          # 项目配置
└── README.md             # 说明文档
```

## 🔧 配置说明

### RSS源配置

编辑 `rss-manager.js` 添加/删除RSS源：

```javascript
{ 
  id: 1, 
  name: '量子位', 
  url: 'https://www.qbitai.com/feed', 
  category: 'ai_news',
  enabled: true 
}
```

### AI摘要配置

**启用条件：** 配置 `ANTHROPIC_API_KEY` 环境变量

**成本估算：**
- 单篇文章：约 $0.045 (¥0.32)
- 每日200篇：约 $9/天 = $270/月

**优化建议：**
- 只为重要文章生成摘要
- 使用Haiku模型降低成本90%
- 限制输入长度为10000字

## 🎨 主要功能预览

### AI自动摘要
```
用户点击文章标题
    ↓
精美摘要详情页（紫色渐变）
    ↓
AI生成800-1000字核心内容
    ↓
点击"阅读原文"访问完整文章
```

### 实时推送
```
RSS抓取到新文章
    ↓
WebSocket广播通知
    ↓
页面顶部显示提醒条
    ↓
用户点击刷新查看新内容
```

### 管理后台
```
访问 /admin.html
    ↓
输入密码：admin123
    ↓
添加/编辑/删除RSS源
    ↓
手动触发抓取
```

## 🔑 环境变量

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `PORT` | 否 | 服务器端口（默认3000） |
| `ANTHROPIC_API_KEY` | 否 | Claude API密钥（启用AI摘要） |

## 📊 API端点

### 公开API
- `GET /api/articles` - 获取文章列表（分页）
- `GET /api/article/:id` - 获取文章详情（含摘要）
- `GET /api/stats` - 获取统计数据
- `GET /api/conferences` - 获取会议列表
- `POST /api/fetch` - 手动触发抓取

### 管理API（需密码）
- `POST /api/admin/verify` - 验证密码
- `GET /api/admin/feeds` - 获取所有RSS源
- `POST /api/admin/feeds` - 添加RSS源
- `PUT /api/admin/feeds/:id` - 更新RSS源
- `DELETE /api/admin/feeds/:id` - 删除RSS源

## 🛠 技术栈

### 后端
- **Node.js** + **Express** - Web服务器
- **SQLite** - 轻量级数据库
- **RSS Parser** - RSS解析
- **WebSocket** - 实时推送
- **Cheerio** - HTML解析

### 前端
- **原生JavaScript** - 无框架依赖
- **CSS3** - 现代化样式
- **Responsive Design** - 响应式布局

### AI服务
- **Claude Sonnet 4** - 文章摘要生成
- **Claude Haiku 4** - 翻译（可选）

## 📈 数据统计

- **30+ RSS源** - 覆盖主流AI/IT媒体
- **15分钟更新** - 自动定时抓取
- **实时推送** - WebSocket通知
- **AI摘要** - 自动提炼核心内容
- **50家大模型厂商** - 全球AI公司地图
- **200个AI产品** - 量子位智库榜单

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

### 开发流程
1. Fork本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

## 📝 更新日志

### v3.0.0 (2026-02-24)
- ✅ 新增AI自动摘要功能
- ✅ 新增量子位AI 100双榜单
- ✅ 优化摘要详情页设计
- ✅ 支持智能文章抓取

### v2.0.0 (2026-01-22)
- ✅ 新增AI大模型厂商Tab
- ✅ 新增AI翻译功能
- ✅ 新增12个国际RSS源
- ✅ 优化UI设计

### v1.0.0 (2025-12-15)
- ✅ 基础RSS聚合功能
- ✅ WebSocket实时推送
- ✅ 分类展示
- ✅ 管理后台

## 📄 许可证

MIT License

## 🙏 致谢

- RSS源提供方：量子位、机器之心、36氪、OpenAI、Google等
- AI服务：Anthropic Claude
- 榜单数据：量子位智库

## 📞 联系方式

- GitHub Issues: [提交问题](https://github.com/你的用户名/wechat-rss-aggregator/issues)
- 项目主页: [查看详情](https://github.com/你的用户名/wechat-rss-aggregator)

---

**⭐ 如果这个项目对你有帮助，请给个Star支持一下！**
