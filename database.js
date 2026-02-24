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
      title_zh TEXT,
      title_en TEXT,
      description_zh TEXT,
      description_en TEXT,
      original_language TEXT DEFAULT 'zh',
      summary TEXT,
      summary_generated_at DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('❌ 创建表失败:', err.message);
    } else {
      console.log('✅ 数据库表已就绪');
      // 检查并添加新字段（兼容旧数据库）
      addCategoryColumn();
      addTranslationColumns();
      addSummaryColumn();
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
          console.log('✅ category字段添加成功');
        }
      });
    }
  });
}

// 添加翻译相关字段
function addTranslationColumns() {
  db.all("PRAGMA table_info(articles)", (err, rows) => {
    if (err) {
      console.error('❌ 检查表结构失败:', err.message);
      return;
    }
    
    const hasTranslation = rows.some(row => row.name === 'title_zh');
    
    if (!hasTranslation) {
      console.log('🔄 添加翻译字段...');
      db.run(`
        ALTER TABLE articles ADD COLUMN title_zh TEXT;
        ALTER TABLE articles ADD COLUMN title_en TEXT;
        ALTER TABLE articles ADD COLUMN description_zh TEXT;
        ALTER TABLE articles ADD COLUMN description_en TEXT;
        ALTER TABLE articles ADD COLUMN original_language TEXT DEFAULT 'zh';
      `, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('❌ 添加翻译字段失败:', err.message);
        } else {
          console.log('✅ 翻译字段添加成功');
        }
      });
    }
  });
}

// 添加摘要字段（新增）
function addSummaryColumn() {
  db.all("PRAGMA table_info(articles)", (err, rows) => {
    if (err) {
      console.error('❌ 检查表结构失败:', err.message);
      return;
    }
    
    const hasSummary = rows.some(row => row.name === 'summary');
    
    if (!hasSummary) {
      console.log('🔄 添加摘要字段...');
      db.serialize(() => {
        db.run(`ALTER TABLE articles ADD COLUMN summary TEXT`, (err) => {
          if (err && !err.message.includes('duplicate column')) {
            console.error('❌ 添加summary字段失败:', err.message);
          }
        });
        db.run(`ALTER TABLE articles ADD COLUMN summary_generated_at DATETIME`, (err) => {
          if (err && !err.message.includes('duplicate column')) {
            console.error('❌ 添加summary_generated_at字段失败:', err.message);
          } else {
            console.log('✅ 摘要字段添加成功');
          }
        });
      });
    }
  });
}

module.exports = db;
