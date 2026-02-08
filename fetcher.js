const Parser = require('rss-parser');
const db = require('./database');

const parser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'content'],
      ['description', 'description']
    ]
  }
});

// ⭐ 配置您的 we-mp-rss 服务
const WE_MP_RSS_BASE_URL = 'https://we-mp-rss-production-fcb0.up.railway.app';

// ⭐ RSS源列表 - 已配置您的 we-mp-rss 服务
const RSS_FEEDS = [
  {
    name: 'WAIC',
    url: 'https://we-mp-rss-production-fcb0.up.railway.app/feed/MP_WXS_3201788143.rss',
  },
  {
    name: '机器之心',
    url: 'https://we-mp-rss-production-fcb0.up.railway.app/feed/MP_WXS_3098132220.rss',
  },
  {
    name: '量子位',
    url: 'https://we-mp-rss-production-fcb0.up.railway.app/feed/MP_WXS_3271041950.rss',
  },
  {
    name: 'AI前线',
    url: 'https://we-mp-rss-production-fcb0.up.railway.app/feed/MP_WXS_3236757533.rss',
  },
  {
    name: '新智元',
    url: 'https://we-mp-rss-production-fcb0.up.railway.app/feed/MP_WXS_3073282833.rss',
  },
  {
    name: '智能涌现',
    url: 'https://we-mp-rss-production-fcb0.up.railway.app/feed/MP_WXS_3582835969.rss',
  },
];

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
             (title, link, description, content, pubDate, author, source, imageUrl) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              item.title || '无标题',
              item.link,
              item.contentSnippet || item.description || '',
              item.content || item.description || '',
              item.pubDate || new Date().toISOString(),
              item.creator || item.author || '未知作者',
              feed.name,
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

  return {
    totalNew,
    totalSkip,
    errors,
    duration
  };
}

module.exports = { fetchArticles };
