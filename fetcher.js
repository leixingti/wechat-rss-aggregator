const Parser = require('rss-parser');
const db = require('./database');
const { getRSSFeeds } = require('./rss-manager');

const parser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'content'],
      ['description', 'description']
    ]
  }
});

// 从配置文件动态获取RSS源
function getActiveFeeds() {
  return getRSSFeeds();
}

/**
 * 从单个RSS源抓取文章
 */
async function fetchFromFeed(feed) {
  try {
    console.log(`📡 正在抓取: ${feed.name}`);
    const feedData = await parser.parseURL(feed.url);
    
    let newCount = 0;
    let skipCount = 0;

    for (const item of feedData.items) {
      try {
        // 提取图片URL（如果有）
        let imageUrl = null;
        if (item.content) {
          const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/);
          if (imgMatch) {
            imageUrl = imgMatch[1];
          }
        }

        // 插入数据库（如果不存在）
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT OR IGNORE INTO articles 
             (title, link, description, content, pubDate, author, source, category, imageUrl) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              item.title || '无标题',
              item.link,
              item.contentSnippet || item.description || '',
              item.content || item.description || '',
              item.pubDate || new Date().toISOString(),
              item.creator || item.author || '未知作者',
              feed.name,
              feed.category || 'ai_news',
              imageUrl
            ],
            function(err) {
              if (err) {
                if (err.message.includes('UNIQUE constraint')) {
                  skipCount++;
                  resolve();
                } else {
                  reject(err);
                }
              } else if (this.changes > 0) {
                newCount++;
                
                // 异步生成摘要（不阻塞RSS抓取）
                const insertedId = this.lastID;
                const { generateSummary } = require('./summarizer');
                
                setImmediate(async () => {
                  try {
                    const summary = await generateSummary({
                      id: insertedId,
                      title: item.title,
                      link: item.link,
                      content: item.content || item.description,
                      description: item.contentSnippet || item.description,
                      source: feed.name
                    });
                    
                    if (summary) {
                      db.run(
                        'UPDATE articles SET summary = ?, summary_generated_at = CURRENT_TIMESTAMP WHERE id = ?',
                        [summary, insertedId]
                      );
                    }
                  } catch (err) {
                    console.error('  ⚠️  摘要生成失败:', err.message);
                  }
                });
                
                resolve();
              } else {
                skipCount++;
                resolve();
              }
            }
          );
        });
      } catch (itemErr) {
        console.error(`  ⚠️  处理文章失败: ${item.title}`, itemErr.message);
      }
    }

    console.log(`  ✅ ${feed.name}: 新增 ${newCount} 篇，跳过 ${skipCount} 篇`);
    return { newCount, skipCount };
  } catch (error) {
    console.error(`  ❌ ${feed.name} 抓取失败:`, error.message);
    return { newCount: 0, skipCount: 0, error: error.message };
  }
}

/**
 * 抓取所有RSS源的文章
 */
async function fetchArticles() {
  console.log('🚀 开始抓取文章...');
  const startTime = Date.now();
  
  // 动态获取RSS源列表
  const RSS_FEEDS = getActiveFeeds();
  
  if (RSS_FEEDS.length === 0) {
    console.log('⚠️  没有配置RSS源');
    return {
      totalNew: 0,
      totalSkip: 0,
      errors: ['没有配置RSS源'],
      duration: 0
    };
  }
  
  let totalNew = 0;
  let totalSkip = 0;
  const errors = [];

  // 并发抓取所有RSS源
  const results = await Promise.allSettled(
    RSS_FEEDS.map(feed => fetchFromFeed(feed))
  );

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      totalNew += result.value.newCount;
      totalSkip += result.value.skipCount;
      if (result.value.error) {
        errors.push(`${RSS_FEEDS[index].name}: ${result.value.error}`);
      }
    } else {
      errors.push(`${RSS_FEEDS[index].name}: ${result.reason}`);
    }
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('📊 抓取完成统计:');
  console.log(`   新增文章: ${totalNew} 篇`);
  console.log(`   跳过重复: ${totalSkip} 篇`);
  console.log(`   用时: ${duration} 秒`);
  
  if (errors.length > 0) {
    console.log(`   ⚠️  错误: ${errors.length} 个`);
    errors.forEach(err => console.log(`      - ${err}`));
  }
  
  // 如果有新文章，通过WebSocket推送给所有客户端
  if (totalNew > 0 && global.broadcastNewArticles) {
    console.log(`📢 准备推送 ${totalNew} 篇新文章...`);
    
    // 获取最新的文章（按分类）
    db.all(
      `SELECT * FROM articles ORDER BY pubDate DESC LIMIT ?`,
      [totalNew],
      (err, articles) => {
        if (err) {
          console.error('获取新文章失败:', err);
          return;
        }
        
        // 按分类分组
        const articlesByCategory = {
          ai_news: [],
          it_news: []
        };
        
        articles.forEach(article => {
          const category = article.category || 'ai_news';
          if (articlesByCategory[category]) {
            articlesByCategory[category].push(article);
          }
        });
        
        // 分别推送不同分类的文章
        if (articlesByCategory.ai_news.length > 0) {
          global.broadcastNewArticles(articlesByCategory.ai_news, 'ai_news');
        }
        if (articlesByCategory.it_news.length > 0) {
          global.broadcastNewArticles(articlesByCategory.it_news, 'it_news');
        }
      }
    );
  }

  return {
    totalNew,
    totalSkip,
    errors,
    duration
  };
}

module.exports = { fetchArticles };
