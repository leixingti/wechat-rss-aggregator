const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 数据库路径配置（支持云服务器持久化存储）
const getDbPath = () => {
  // 优先级：环境变量 > /app/data > /data > 项目目录
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }

  const dataDirs = ['/app/data', '/data'];
  for (const dir of dataDirs) {
    if (fs.existsSync(dir) || process.env.NODE_ENV === 'production') {
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
        } catch (e) {
          console.warn(`⚠️ 无法创建目录 ${dir}:`, e.message);
        }
      }
      return path.join(dir, 'articles.db');
    }
  }

  return path.join(__dirname, 'articles.db');
};

const dbPath = getDbPath();

// 确保目录存在
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  try {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`📁 创建数据库目录: ${dbDir}`);
  } catch (err) {
    console.error(`❌ 无法创建数据库目录: ${err.message}`);
  }
}

console.log(`📍 数据库路径: ${dbPath}`);

// 创建或连接数据库
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 数据库连接失败:', err.message);
  } else {
    console.log('✅ 数据库连接成功');

    // 启用 WAL 模式以支持多进程并发访问
    db.run('PRAGMA journal_mode=WAL', (err) => {
      if (err) {
        console.warn('⚠️  WAL 模式启用失败:', err.message);
      } else {
        console.log('✅ WAL 模式已启用（支持多进程并发）');
      }
    });

    // 配置数据库超时和其他并发优化
    db.configure('busyTimeout', 10000); // 10秒超时
    db.run('PRAGMA synchronous=NORMAL'); // 性能优化（仍保持数据安全）

    initDatabase();
  }
});

// 初始化数据库表
function initDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      link TEXT UNIQUE NOT NULL,
      description TEXT,
      content TEXT,
      pubDate TEXT,
      author TEXT,
      source TEXT,
      category TEXT DEFAULT 'ai_news',
      imageUrl TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('❌ 创建表失败:', err.message);
    } else {
      console.log('✅ 数据库表已就绪');
      // 检查并添加category字段（兼容旧数据库）
      addCategoryColumn();
    }
  });
}

// 为已存在的数据库添加category字段
function addCategoryColumn() {
  db.all("PRAGMA table_info(articles)", (err, rows) => {
    if (err) {
      console.error('❌ 检查表结构失败:', err.message);
      return;
    }
    
    const hasCategory = rows.some(row => row.name === 'category');
    
    if (!hasCategory) {
      console.log('🔄 添加category字段...');
      db.run(`ALTER TABLE articles ADD COLUMN category TEXT DEFAULT 'ai_news'`, (err) => {
        if (err) {
          console.error('❌ 添加category字段失败:', err.message);
        } else {
          console.log('✅ category字段已添加');
        }
      });
    }
  });
}

module.exports = db;
