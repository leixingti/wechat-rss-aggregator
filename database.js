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

// 为已存在的数据库添加缺失字段
function addCategoryColumn() {
  db.all("PRAGMA table_info(articles)", (err, rows) => {
    if (err) {
      console.error('❌ 检查表结构失败:', err.message);
      return;
    }

    const hasCategory = rows.some(row => row.name === 'category');
    const hasAiSummary = rows.some(row => row.name === 'ai_summary');

    let pendingAlters = 0;

    if (!hasCategory) {
      pendingAlters++;
      console.log('🔄 添加category字段...');
      db.run(`ALTER TABLE articles ADD COLUMN category TEXT DEFAULT 'ai_news'`, (err) => {
        if (err) {
          console.error('❌ 添加category字段失败:', err.message);
        } else {
          console.log('✅ category字段已添加');
        }
        if (--pendingAlters === 0) checkAndRestoreBackup();
      });
    }

    if (!hasAiSummary) {
      pendingAlters++;
      console.log('🔄 添加ai_summary字段...');
      db.run(`ALTER TABLE articles ADD COLUMN ai_summary TEXT`, (err) => {
        if (err) {
          console.error('❌ 添加ai_summary字段失败:', err.message);
        } else {
          console.log('✅ ai_summary字段已添加');
        }
        if (--pendingAlters === 0) checkAndRestoreBackup();
      });
    }

    if (pendingAlters === 0) {
      // 所有字段已存在，检查是否需要恢复备份
      checkAndRestoreBackup();
    }
  });
}

// 检查是否需要恢复备份数据库
function checkAndRestoreBackup() {
  db.get("SELECT COUNT(*) as count FROM articles", (err, row) => {
    if (err) {
      console.warn('⚠️ 无法检查数据库内容:', err.message);
      return;
    }

    const articleCount = row ? row.count : 0;

    // 如果数据库为空，尝试从备份恢复
    if (articleCount === 0) {
      const backupPath = path.join(__dirname, 'backups', 'articles-backup.db');

      if (fs.existsSync(backupPath)) {
        console.log('🔄 检测到备份文件，正在恢复数据...');
        restoreFromBackup(backupPath);
      } else {
        console.log('📭 数据库为空，未找到备份文件');
      }
    } else {
      console.log(`✅ 数据库已包含 ${articleCount} 篇文章`);
    }
  });
}

// 从备份文件恢复数据库
function restoreFromBackup(backupPath) {
  const exec = require('child_process').execFile;
  const sqlite3Path = process.env.SQLITE3_PATH || 'sqlite3';

  // 方案 1: 使用 Node.js 的 sqlite3 模块直接复制
  const backupDb = new sqlite3.Database(backupPath, (err) => {
    if (err) {
      console.error('❌ 无法打开备份数据库:', err.message);
      return;
    }

    console.log('📂 正在扫描备份数据库...');

    // 先获取备份数据库中的文章数量
    backupDb.get("SELECT COUNT(*) as count FROM articles", (err, row) => {
      if (err) {
        console.error('❌ 无法读取备份数据库:', err.message);
        backupDb.close();
        return;
      }

      const backupCount = row ? row.count : 0;
      console.log(`📊 备份文件包含 ${backupCount} 篇文章`);

      // 使用 INSERT OR IGNORE 避免重复（如果有重复的 link）
      backupDb.all('SELECT * FROM articles', (err, rows) => {
        if (err) {
          console.error('❌ 无法读取备份数据:', err.message);
          backupDb.close();
          return;
        }

        if (!rows || rows.length === 0) {
          console.warn('⚠️ 备份数据库为空');
          backupDb.close();
          return;
        }

        // 开始插入数据
        let insertedCount = 0;
        let skippedCount = 0;

        db.run('BEGIN TRANSACTION');

        const insertRow = (index) => {
          if (index >= rows.length) {
            // 所有行都已处理
            db.run('COMMIT', (err) => {
              if (err) {
                console.error('❌ 提交事务失败:', err.message);
              } else {
                console.log(`✅ 数据恢复完成！已插入 ${insertedCount} 篇文章（跳过 ${skippedCount} 篇重复）`);
              }
              backupDb.close();
            });
            return;
          }

          const row = rows[index];
          const sql = `
            INSERT OR IGNORE INTO articles
            (title, link, description, content, pubDate, author, source, category, imageUrl, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          db.run(sql, [
            row.title,
            row.link,
            row.description,
            row.content,
            row.pubDate,
            row.author,
            row.source,
            row.category || 'ai_news',
            row.imageUrl,
            row.createdAt || new Date().toISOString()
          ], function(err) {
            if (err) {
              console.error(`❌ 插入第 ${index + 1} 行失败:`, err.message);
              skippedCount++;
            } else if (this.changes > 0) {
              insertedCount++;
              if (insertedCount % 100 === 0) {
                console.log(`⏳ 已处理 ${insertedCount} 篇文章...`);
              }
            } else {
              skippedCount++; // INSERT OR IGNORE 被忽略
            }

            insertRow(index + 1);
          });
        };

        insertRow(0);
      });
    });
  });
}

module.exports = db;
