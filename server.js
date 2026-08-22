const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const db = require('./database');
const { fetchArticles } = require('./fetcher');
const rssManager = require('./rss-manager');
const { generateArticleSummary, translateArticleToChinese } = require('./llm');
const { runDailyAIFocusCuration } = require('./ai-curator');

// 环境变量配置
require('dotenv').config();

// 日志系统
const LOG_DIR = process.env.LOG_DIR || path.join(process.env.HOME || '/tmp', '.wechat-rss/logs');
if (!fs.existsSync(LOG_DIR)) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch (e) {
    console.warn(`⚠️ 无法创建日志目录: ${e.message}`);
  }
}

// 日志函数
const log = {
  info: (msg) => console.log(`[${new Date().toISOString()}] ℹ️  ${msg}`),
  success: (msg) => console.log(`[${new Date().toISOString()}] ✅ ${msg}`),
  warn: (msg) => console.warn(`[${new Date().toISOString()}] ⚠️  ${msg}`),
  error: (msg, err) => console.error(`[${new Date().toISOString()}] ❌ ${msg}`, err ? err.message : '')
};

log.info(`==== 应用启动 ====`);
log.info(`Node.js 版本: ${process.version}`);
log.info(`环境: ${process.env.NODE_ENV || 'development'}`);
log.info(`日志目录: ${LOG_DIR}`);

const app = express();
const PORT = process.env.PORT || 3000;
// Railway 需要绑定到 0.0.0.0 才能让外部流量访问
const HOST = process.env.HOST || '0.0.0.0';

log.info(`监听地址: ${HOST}:${PORT}`);

// 创建HTTP服务器
const server = http.createServer(app);

// 创建WebSocket服务器
const wss = new WebSocket.Server({ server });

// WebSocket连接管理
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('🔌 新的WebSocket连接');
  clients.add(ws);
  
  // 发送欢迎消息
  ws.send(JSON.stringify({
    type: 'connected',
    message: '实时推送已连接',
    timestamp: new Date().toISOString()
  }));
  
  ws.on('close', () => {
    console.log('🔌 WebSocket连接断开');
    clients.delete(ws);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket错误:', error);
    clients.delete(ws);
  });
});

// 广播新文章给所有客户端
function broadcastNewArticles(articles, category) {
  const message = JSON.stringify({
    type: 'new_articles',
    category: category,
    count: articles.length,
    articles: articles,
    timestamp: new Date().toISOString()
  });
  
  let successCount = 0;
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
        successCount++;
      } catch (error) {
        console.error('发送消息失败:', error);
      }
    }
  });
  
  console.log(`📢 已向 ${successCount} 个客户端推送 ${articles.length} 篇新文章`);
}

// 导出广播函数供其他模块使用
global.broadcastNewArticles = broadcastNewArticles;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

  query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';

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

// API: 文章日期统计（基于全表，避免分页/limit 截断导致的统计错误）
// 由前端传入按本地时区计算的日界限（ISO 时间戳），服务端按绝对时间比较，
// 这样无论服务器时区如何，统计口径都与用户浏览器一致。
app.get('/api/stats', (req, res) => {
  db.all('SELECT pubDate FROM articles', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // 解析前端传入的日界限；缺省时回退到服务器本地时间
    const parseBoundary = (v, fallback) => {
      const d = v ? new Date(v) : null;
      return d && !isNaN(d.getTime()) ? d : fallback;
    };

    const now = new Date();
    const defToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const defYesterday = new Date(defToday); defYesterday.setDate(defYesterday.getDate() - 1);
    const defWeekAgo = new Date(defToday); defWeekAgo.setDate(defWeekAgo.getDate() - 7);

    const today = parseBoundary(req.query.today, defToday);
    const yesterday = parseBoundary(req.query.yesterday, defYesterday);
    const weekAgo = parseBoundary(req.query.weekAgo, defWeekAgo);

    let todayCount = 0, yesterdayCount = 0, weekCount = 0, olderCount = 0, invalidCount = 0;

    rows.forEach(r => {
      const d = new Date(r.pubDate);
      if (isNaN(d.getTime())) {
        // pubDate 无法解析的归入“更早”，保证各分桶之和等于总数
        invalidCount++;
        olderCount++;
        return;
      }
      if (d >= today) todayCount++;
      else if (d >= yesterday) yesterdayCount++;
      else if (d >= weekAgo) weekCount++;
      else olderCount++;
    });

    res.json({
      total: rows.length,
      today: todayCount,
      yesterday: yesterdayCount,
      week: weekCount,
      older: olderCount,
      invalidDates: invalidCount
    });
  });
});

// 获取"AI聚焦"当日精选文章（每日10点由定时任务生成，最多50条，按重要性排序）
// 必须定义在 /api/articles/:id 之前，否则会被 :id 路由拦截（"ai-focus"当作id处理）
app.get('/api/articles/ai-focus', (req, res) => {
  db.all(
    'SELECT * FROM articles WHERE is_featured = 1 ORDER BY featured_rank ASC',
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true, articles: rows });
    }
  );
});

// 获取文章列表（支持分类筛选，服务端分页）
// 必须定义在 /api/articles/:id 之前，否则会被 :id 路由拦截（"by-category"当作id处理）
app.get('/api/articles/by-category', (req, res) => {
  const { category, page = 1, limit = 100 } = req.query;
  const offset = (page - 1) * limit;

  let query = 'SELECT * FROM articles';
  let countQuery = 'SELECT COUNT(*) as total FROM articles';
  const params = [];

  if (category && category !== 'all') {
    query += ' WHERE category = ?';
    countQuery += ' WHERE category = ?';
    params.push(category);
  }

  query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  db.get(countQuery, category ? [category] : [], (err, countResult) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }

    db.all(query, params, (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }

      res.json({
        success: true,
        articles: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limit)
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

// API: 获取或生成文章 AI 摘要（DeepSeek，支持缓存）
app.get('/api/articles/:id/summary', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM articles WHERE id = ?', [id], async (err, article) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    // 已有缓存摘要，直接返回
    if (article.ai_summary) {
      return res.json({ summary: article.ai_summary, cached: true });
    }

    // 调用DeepSeek生成摘要
    try {
      const summary = await generateArticleSummary(article);
      // 写入数据库缓存（异步，不等待）
      db.run('UPDATE articles SET ai_summary = ? WHERE id = ?', [summary, id], (updateErr) => {
        if (updateErr) {
          log.warn(`缓存摘要写入失败 id=${id}: ${updateErr.message}`);
        }
      });
      res.json({ summary, cached: false });
    } catch (e) {
      log.error(`摘要生成失败 id=${id}:`, e);
      res.status(500).json({ error: `摘要生成失败: ${e.message}` });
    }
  });
});

// API: 获取或生成文章中文翻译（英文来源文章点击弹窗展示，支持缓存）
app.get('/api/articles/:id/translate', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM articles WHERE id = ?', [id], async (err, article) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    if (article.translated_title || article.translated_content) {
      return res.json({
        translatedTitle: article.translated_title,
        translatedContent: article.translated_content,
        cached: true
      });
    }

    try {
      const { title, content } = await translateArticleToChinese(article);
      db.run(
        'UPDATE articles SET translated_title = ?, translated_content = ? WHERE id = ?',
        [title, content, id],
        (updateErr) => {
          if (updateErr) log.warn(`缓存翻译写入失败 id=${id}: ${updateErr.message}`);
        }
      );
      res.json({ translatedTitle: title, translatedContent: content, cached: false });
    } catch (e) {
      log.error(`翻译失败 id=${id}:`, e);
      res.status(500).json({ error: `翻译失败: ${e.message}` });
    }
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
  const { name, url, category } = req.body;
  if (!name || !url) {
    return res.status(400).json({ success: false, error: '缺少参数' });
  }
  const success = rssManager.addRSSFeed(name, url, category);
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

// ========================================
// 数据导出 API（含审批流程）
// ========================================

// 下载数据导出申请表 Word 模板
app.get('/api/admin/export-template', authMiddleware, async (req, res) => {
  try {
    const genScript = path.join(__dirname, 'generate-export-form.js');
    if (!require('fs').existsSync(genScript)) {
      return res.status(404).json({ success: false, error: '模板生成脚本不存在' });
    }
    // 动态 require 生成器并直接获取 Buffer（不写文件）
    const {
      Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun,
      HeadingLevel, AlignmentType, WidthType, BorderStyle, VerticalAlign, ShadingType
    } = require('docx');

    // 直接读取已生成的文件（generate-export-form.js 会写到项目目录）
    const docxPath = path.join(__dirname, '数据导出申请表.docx');
    if (require('fs').existsSync(docxPath)) {
      const buf = require('fs').readFileSync(docxPath);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', 'attachment; filename*=UTF-8\'\'%E6%95%B0%E6%8D%AE%E5%AF%BC%E5%87%BA%E7%94%B3%E8%AF%B7%E8%A1%A8.docx');
      res.setHeader('Content-Length', buf.length);
      return res.send(buf);
    }
    res.status(404).json({ success: false, error: '模板文件尚未生成，请先运行 node generate-export-form.js' });
  } catch (e) {
    log.error('下载模板失败:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// 允许导出的字段白名单
const EXPORTABLE_FIELDS = ['id', 'title', 'link', 'description', 'pubDate', 'author', 'source', 'category', 'imageUrl', 'createdAt', 'ai_summary'];

// 预览导出数据量
app.get('/api/admin/export-preview', authMiddleware, (req, res) => {
  const { category, startDate, endDate } = req.query;
  let query = 'SELECT COUNT(*) as total FROM articles WHERE 1=1';
  const params = [];
  if (category && category !== 'all') { query += ' AND category = ?'; params.push(category); }
  if (startDate) { query += ' AND createdAt >= ?'; params.push(startDate); }
  if (endDate) { query += ' AND createdAt <= ?'; params.push(endDate + ' 23:59:59'); }
  db.get(query, params, (err, row) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, count: row.total });
  });
});

// 执行数据导出（需完整审批信息）
app.post('/api/admin/export', authMiddleware, (req, res) => {
  const {
    applicantName, department, contact,
    purposeType, purpose, dataScope,
    category, startDate, endDate,
    fields, format, commitment
  } = req.body;

  if (!applicantName || !department || !purpose || !commitment) {
    return res.status(400).json({ success: false, error: '请填写完整申请信息并勾选承诺书' });
  }

  const selectedFields = Array.isArray(fields) && fields.length > 0
    ? fields.filter(f => EXPORTABLE_FIELDS.includes(f))
    : EXPORTABLE_FIELDS;

  if (selectedFields.length === 0) {
    return res.status(400).json({ success: false, error: '请至少选择一个导出字段' });
  }

  let query = `SELECT ${selectedFields.join(', ')} FROM articles WHERE 1=1`;
  const params = [];
  if (category && category !== 'all') { query += ' AND category = ?'; params.push(category); }
  if (startDate) { query += ' AND createdAt >= ?'; params.push(startDate); }
  if (endDate) { query += ' AND createdAt <= ?'; params.push(endDate + ' 23:59:59'); }
  query += ' ORDER BY createdAt DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });

    const exportedAt = new Date().toISOString();

    // 写入审批日志
    db.run(
      `INSERT INTO export_logs (applicant_name, department, contact, purpose_type, purpose, data_scope, category, start_date, end_date, fields, format, record_count, exported_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [applicantName, department, contact || '', purposeType || '', purpose, dataScope || '', category || 'all', startDate || '', endDate || '', selectedFields.join(','), format || 'csv', rows.length, exportedAt],
      (logErr) => { if (logErr) log.warn('导出日志记录失败: ' + logErr.message); }
    );

    const filename = `articles-export-${exportedAt.slice(0, 10)}-${Date.now()}`;

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      res.json({
        exportInfo: { applicantName, department, purpose, category: category || 'all', startDate, endDate, fields: selectedFields, format, recordCount: rows.length, exportedAt },
        data: rows
      });
    } else {
      // CSV（BOM 使 Excel 正常显示中文）
      const csvHeader = selectedFields.join(',');
      const csvRows = rows.map(row =>
        selectedFields.map(f => {
          const val = row[f] == null ? '' : String(row[f]);
          return `"${val.replace(/"/g, '""')}"`;
        }).join(',')
      );
      const csv = '\ufeff' + [csvHeader, ...csvRows].join('\r\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csv);
    }
  });
});

// 获取导出审批日志（最近 100 条）
app.get('/api/admin/export-logs', authMiddleware, (req, res) => {
  db.all('SELECT * FROM export_logs ORDER BY exported_at DESC LIMIT 100', [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, logs: rows });
  });
});

// ========================================
// AI 每日精选
// ========================================

// 手动触发AI聚焦精选（和每日10点定时任务逻辑完全一致：先抓取一次再精选），方便验证
app.post('/api/admin/curate-ai-focus', authMiddleware, async (req, res) => {
  try {
    await fetchArticles();
    const result = await runDailyAIFocusCuration();
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 一次性历史积压清理：把24小时窗口之外、仍挂着ai_news但未被精选标记的存量文章下放到it_news
app.post('/api/admin/backfill-reclassify', authMiddleware, (req, res) => {
  db.run(
    `UPDATE articles
     SET category = 'it_news'
     WHERE category = 'ai_news'
       AND is_featured = 0
       AND datetime(createdAt) < datetime('now', '-24 hours')`,
    [],
    function (err) {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true, updatedCount: this.changes });
    }
  );
});

// ========================================
// 会议 API
// ========================================
const { getAllConferences, getUpcomingConferences, generateICS } = require('./conferences');

// 获取所有会议
app.get('/api/conferences', (req, res) => {
  const conferences = getAllConferences();
  res.json({ success: true, conferences });
});

// 获取即将举行的会议
app.get('/api/conferences/upcoming', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const conferences = getUpcomingConferences(limit);
  res.json({ success: true, conferences });
});

// 下载会议日历文件
app.get('/api/conferences/:id/calendar', (req, res) => {
  const { id } = req.params;
  const conferences = getAllConferences();
  const conference = conferences.find(c => c.id === id);
  
  if (!conference) {
    return res.status(404).json({ success: false, error: '会议未找到' });
  }
  
  const icsContent = generateICS(conference);
  
  res.setHeader('Content-Type', 'text/calendar');
  res.setHeader('Content-Disposition', `attachment; filename="${conference.id}.ics"`);
  res.send(icsContent);
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
}, { timezone: 'Asia/Shanghai' });

// 定时任务：每天10点做一次AI聚焦精选（先强制抓取一次保证候选池新鲜，再去重+排序选出最重要的最多50条）
cron.schedule('0 10 * * *', async () => {
  console.log('⏰ AI聚焦每日精选任务触发 -', new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }));
  try {
    await fetchArticles();
    const result = await runDailyAIFocusCuration();
    console.log('✅ AI聚焦精选完成', result);
  } catch (error) {
    console.error('❌ AI聚焦精选失败:', error);
  }
}, { timezone: 'Asia/Shanghai' });

// 启动服务器
server.listen(PORT, HOST, () => {
  log.success(`HTTP服务器运行在 http://${HOST}:${PORT}`);
  log.success(`WebSocket服务器运行在 ws://${HOST}:${PORT}`);
  log.info(`定时任务已设置：每15分钟抓取一次文章`);
  log.info(`健康检查：http://${HOST}:${PORT}/health`);
  log.info(`当前WebSocket连接数: 0`);

  // 延迟启动初始化抓取，给应用充足的初始化时间
  // Railway 环境下需要更长的延迟（10秒）确保应用完全启动
  const initialFetchDelay = process.env.NODE_ENV === 'production' ? 10000 : 5000;
  log.info(`将在 ${initialFetchDelay}ms 后启动初始 RSS 抓取...`);

  setTimeout(() => {
    log.info('🔄 启动初始 RSS 抓取（限制并发为 3）...');
    fetchArticles().then(() => {
      log.success('初始数据加载完成');
    }).catch(err => {
      log.error('初始数据加载失败:', err);
    });
  }, initialFetchDelay);
});

// 优雅关闭处理
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

process.on('SIGINT', () => {
  log.warn('收到 SIGINT 信号，开始优雅关闭...');
  server.close(() => {
    log.success('HTTP 服务器已关闭');
    db.close(() => {
      log.success('数据库连接已关闭');
      process.exit(0);
    });
  });
});

// 未捕获异常处理
process.on('uncaughtException', (err) => {
  log.error('未捕获的异常:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('未处理的 Promise 拒绝:', new Error(String(reason)));
});
