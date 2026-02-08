const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 创建或连接数据库
const dbPath = path.join(__dirname, 'articles.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 数据库连接失败:', err.message);
  } else {
    console.log('✅ 数据库连接成功');
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
