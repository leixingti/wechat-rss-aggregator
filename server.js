const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');
const db = require('./database');
const { fetchArticles } = require('./fetcher');
const rssManager = require('./rss-manager');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 健康检查端点
app.get('/health', (req, res) => {
  db.get('SELECT COUNT(*) as count FROM articles', (err, row) => {
    if (err) {
      return res.status(500).json({ 
        status: 'error', 
        message: err.message 
      });
    }
    res.json({
      status: 'ok',
      articlesCount: row.count,
      lastCheck: new Date().toISOString()
    });
  });
});

// API: 获取所有文章
app.get('/api/articles', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';

  let query = 'SELECT * FROM articles';
  let countQuery = 'SELECT COUNT(*) as total FROM articles';
  const params = [];

  if (search) {
    query += ' WHERE title LIKE ? OR description LIKE ?';
    countQuery += ' WHERE title LIKE ? OR description LIKE ?';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY pubDate DESC LIMIT ? OFFSET ?';
  
  db.get(countQuery, params, (err, countRow) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    db.all(query, [...params, limit, offset], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        articles: rows,
        pagination: {
          page,
          limit,
          total: countRow.total,
          totalPages: Math.ceil(countRow.total / limit)
        }
      });
    });
  });
});

// API: 获取单篇文章
app.get('/api/articles/:id', (req, res) => {
  db.get('SELECT * FROM articles WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: '文章未找到' });
    }
    res.json(row);
  });
});

// API: 手动触发抓取
app.post('/api/fetch', async (req, res) => {
  try {
    console.log('📡 手动触发文章抓取...');
    await fetchArticles();
    res.json({ 
      success: true, 
      message: '文章抓取完成',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 抓取失败:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ========================================
// RSS管理后台 API
// ========================================

// 验证密码中间件
function authMiddleware(req, res, next) {
  const password = req.headers['x-admin-password'];
  if (!password || !rssManager.verifyPassword(password)) {
    return res.status(401).json({ success: false, error: '未授权' });
  }
  next();
}

// 验证密码
app.post('/api/admin/verify', (req, res) => {
  const { password } = req.body;
  const isValid = rssManager.verifyPassword(password);
  res.json({ success: isValid });
});

// 获取所有RSS源
app.get('/api/admin/feeds', authMiddleware, (req, res) => {
  const feeds = rssManager.getAllRSSFeeds();
  res.json({ success: true, feeds });
});

// 添加RSS源
app.post('/api/admin/feeds', authMiddleware, (req, res) => {
  const { name, url } = req.body;
  if (!name || !url) {
    return res.status(400).json({ success: false, error: '缺少参数' });
  }
  const success = rssManager.addRSSFeed(name, url);
  res.json({ success });
});

// 更新RSS源
app.put('/api/admin/feeds/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const success = rssManager.updateRSSFeed(id, updates);
  res.json({ success });
});

// 删除RSS源
app.delete('/api/admin/feeds/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const success = rssManager.deleteRSSFeed(id);
  res.json({ success });
});

// 修改密码
app.post('/api/admin/change-password', authMiddleware, (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, error: '密码至少6位' });
  }
  const success = rssManager.changePassword(newPassword);
  res.json({ success });
});

// 更新所有文章的来源名称
app.post('/api/admin/update-sources', authMiddleware, async (req, res) => {
  try {
    const { updateArticleSources } = require('./update-sources');
    await updateArticleSources();
    res.json({ success: true, message: '文章来源名称已更新' });
  } catch (error) {
    console.error('更新来源失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 服务前端页面
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 定时任务：每15分钟抓取一次
cron.schedule('*/15 * * * *', async () => {
  console.log('⏰ 定时任务触发 -', new Date().toLocaleString('zh-CN'));
  try {
    await fetchArticles();
    console.log('✅ 定时抓取完成');
  } catch (error) {
    console.error('❌ 定时抓取失败:', error);
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`⏰ 定时任务已设置：每15分钟抓取一次文章`);
  console.log(`📊 健康检查：http://localhost:${PORT}/health`);
  
  // 启动时立即抓取一次
  fetchArticles().then(() => {
    console.log('✅ 初始数据加载完成');
  }).catch(err => {
    console.error('❌ 初始数据加载失败:', err.message);
  });
});
