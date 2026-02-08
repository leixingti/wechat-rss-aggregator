/**
 * 数据库迁移脚本
 * 为现有文章添加category字段并根据source自动分类
 */

const db = require('./database');
const { getAllRSSFeeds } = require('./rss-manager');

async function migrateCategories() {
  console.log('🔄 开始数据迁移...');
  console.log('为现有文章添加分类标记');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const feeds = getAllRSSFeeds();
  let totalUpdated = 0;
  
  for (const feed of feeds) {
    const category = feed.category || 'ai_news';
    
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE articles SET category = ? WHERE source = ? AND (category IS NULL OR category = '')`,
        [category, feed.name],
        function(err) {
          if (err) {
            console.error(`❌ 更新失败 ${feed.name}:`, err.message);
            reject(err);
          } else if (this.changes > 0) {
            console.log(`✅ ${feed.name}: 更新了 ${this.changes} 篇文章 → ${category}`);
            totalUpdated += this.changes;
            resolve();
          } else {
            console.log(`⏭️  ${feed.name}: 没有需要更新的文章`);
            resolve();
          }
        }
      );
    });
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ 迁移完成！共更新 ${totalUpdated} 篇文章的分类`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

// 如果直接运行此脚本
if (require.main === module) {
  migrateCategories()
    .then(() => {
      console.log('✅ 脚本执行完成');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ 脚本执行失败:', err);
      process.exit(1);
    });
}

module.exports = { migrateCategories };
