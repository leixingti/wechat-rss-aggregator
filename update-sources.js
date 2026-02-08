const db = require('./database');
const { getAllRSSFeeds } = require('./rss-manager');

/**
 * 更新数据库中所有文章的来源名称
 * 将旧的公众号名称更新为RSS配置中的新名称
 */
async function updateArticleSources() {
  console.log('🔄 开始更新文章来源名称...');
  
  const feeds = getAllRSSFeeds();
  let totalUpdated = 0;
  
  for (const feed of feeds) {
    // 从RSS URL中提取公众号ID
    const match = feed.url.match(/MP_WXS_(\d+)/);
    if (!match) continue;
    
    const publicAccountId = match[0]; // 例如: MP_WXS_3903631794
    
    // 更新数据库中所有包含这个公众号ID的文章
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE articles SET source = ? WHERE link LIKE ?`,
        [feed.name, `%${publicAccountId}%`],
        function(err) {
          if (err) {
            console.error(`❌ 更新失败 ${feed.name}:`, err.message);
            reject(err);
          } else if (this.changes > 0) {
            console.log(`✅ ${feed.name}: 更新了 ${this.changes} 篇文章`);
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
  console.log(`✅ 更新完成！共更新 ${totalUpdated} 篇文章的来源名称`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

// 如果直接运行此脚本
if (require.main === module) {
  updateArticleSources()
    .then(() => {
      console.log('✅ 脚本执行完成');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ 脚本执行失败:', err);
      process.exit(1);
    });
}

module.exports = { updateArticleSources };
