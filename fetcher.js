const Parser = require('rss-parser');
const https = require('https');
const db = require('./database');
const { getRSSFeeds } = require('./rss-manager');

/**
 * 判断文本是否主要为英文
 */
function isMainlyEnglish(text) {
  if (!text) return false;
  const clean = text.replace(/[^a-zA-Z\u4e00-\u9fff]/g, '');
  if (clean.length === 0) return false;
  const englishChars = clean.replace(/[^a-zA-Z]/g, '').length;
  return englishChars / clean.length > 0.5;
}

/**
 * 调用通义千问翻译英文为中文
 */
async function translateToChinese(title, description) {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) return { title, description };

  const textToTranslate = `标题: ${title}\n摘要: ${(description || '').substring(0, 500)}`;

  const requestBody = JSON.stringify({
    model: 'qwen-turbo-latest',
    messages: [
      { role: 'system', content: '你是专业翻译。将英文翻译为简洁的中文。只输出翻译结果，格式：第一行是翻译后的标题，第二行是翻译后的摘要。不要加任何前缀标签。' },
      { role: 'user', content: textToTranslate }
    ],
    max_tokens: 500
  });

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'dashscope.aliyuncs.com',
      path: '/compatible-mode/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(requestBody)
      },
      timeout: 15000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.message?.content?.trim();
          if (content) {
            const lines = content.split('\n').filter(l => l.trim());
            const translatedTitle = lines[0] || title;
            const translatedDesc = lines.slice(1).join(' ') || description;
            resolve({ title: translatedTitle, description: translatedDesc });
          } else {
            resolve({ title, description });
          }
        } catch { resolve({ title, description }); }
      });
    });
    req.on('error', () => resolve({ title, description }));
    req.on('timeout', () => { req.destroy(); resolve({ title, description }); });
    req.write(requestBody);
    req.end();
  });
}

// AI 相关关键词（用于 it_news 来源的文章自动分类）
const AI_KEYWORDS = [
  'AI', 'A.I.', '人工智能', '机器学习', '深度学习', '大模型', '大语言模型',
  'LLM', 'GPT', 'ChatGPT', 'Claude', 'Gemini', 'Llama', 'Mistral',
  '神经网络', '自然语言处理', 'NLP', '计算机视觉', 'CV', '强化学习',
  'OpenAI', 'Anthropic', 'DeepMind', 'Google AI', 'Meta AI', 'Hugging Face',
  '智谱', '文心', '通义', '混元', '星火', '豆包', 'Kimi', '月之暗面',
  'AGI', 'AIGC', '生成式', '扩散模型', 'Transformer', '向量', 'embedding',
  '算法', '训练', '推理', '微调', 'fine-tune', 'RAG', '智能体', 'Agent',
  '语言模型', '视觉模型', '多模态', 'stable diffusion', 'midjourney',
  '机器人', '自动驾驶', '无人驾驶', '具身智能'
];

const AI_KEYWORDS_LOWER = AI_KEYWORDS.map(k => k.toLowerCase());

/**
 * 判断文章是否属于 AI 相关内容
 */
function isAIRelated(title, description) {
  const text = ((title || '') + ' ' + (description || '')).toLowerCase();
  return AI_KEYWORDS_LOWER.some(kw => text.includes(kw));
}

/**
 * 根据来源分类和文章内容确定最终分类
 * it_news 来源中的 AI 相关文章自动归入 ai_news
 */
function resolveCategory(feedCategory, title, description) {
  if (feedCategory === 'it_news' && isAIRelated(title, description)) {
    return 'ai_news';
  }
  return feedCategory || 'ai_news';
}

const parser = new Parser({
  timeout: 15000, // 减少单个源的超时时间
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

        // 准备标题和描述
        let articleTitle = item.title || '无标题';
        let articleDesc = item.contentSnippet || item.description || '';

        // 社媒动态中的英文内容自动翻译
        if (feed.category === 'weibo' && isMainlyEnglish(articleTitle)) {
          try {
            const translated = await translateToChinese(articleTitle, articleDesc);
            articleTitle = translated.title;
            articleDesc = translated.description;
          } catch (e) {
            // 翻译失败保持原文
          }
        }

        // 插入数据库（如果不存在）
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT OR IGNORE INTO articles
             (title, link, description, content, pubDate, author, source, category, imageUrl)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              articleTitle,
              item.link,
              articleDesc,
              item.content || item.description || '',
              item.pubDate || new Date().toISOString(),
              item.creator || item.author || '未知作者',
              feed.name,
              resolveCategory(feed.category, item.title, item.contentSnippet || item.description),
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
 * 有限并发执行（防止资源耗尽）
 */
async function fetchWithLimit(feeds, limit = 2) {
  const results = [];
  for (let i = 0; i < feeds.length; i += limit) {
    const batch = feeds.slice(i, i + limit);
    const batchResults = await Promise.allSettled(
      batch.map(feed => fetchFromFeed(feed))
    );
    results.push(...batchResults);
    // 批次间等待2秒，避免压垮 we-mp-rss 单线程服务
    if (i + limit < feeds.length) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return results;
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

  // 有限并发抓取 RSS 源（限制为 3 个同时请求）
  console.log(`📊 RSS源数量: ${RSS_FEEDS.length}，限制并发数: 3`);
  const results = await fetchWithLimit(RSS_FEEDS, 3);

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
          it_news: [],
          weibo: []
        };

        articles.forEach(article => {
          const category = article.category || 'ai_news';
          if (articlesByCategory[category]) {
            articlesByCategory[category].push(article);
          }
        });

        // 分别推送不同分类的文章
        Object.keys(articlesByCategory).forEach(cat => {
          if (articlesByCategory[cat].length > 0) {
            global.broadcastNewArticles(articlesByCategory[cat], cat);
          }
        });
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
