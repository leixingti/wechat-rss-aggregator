/**
 * AI文章摘要生成器 - DeepSeek版本
 * 使用DeepSeek API自动提炼RSS文章的核心内容（1000字以内）
 * 成本：约$0.004/篇，比Claude便宜91%
 */

const https = require('https');
const cheerio = require('cheerio');

// 环境变量配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_MODEL = 'deepseek-chat'; // 或 'deepseek-reasoner' 用于复杂推理

/**
 * 调用DeepSeek API生成摘要
 */
async function callDeepSeekAPI(articleContent, title, source) {
  if (!DEEPSEEK_API_KEY) {
    console.warn('⚠️ 未配置DEEPSEEK_API_KEY，跳过摘要生成');
    return null;
  }

  const prompt = `请为以下新闻文章生成一份简洁的中文摘要，要求：

1. **核心内容提炼**：提取文章的主要观点、关键数据和重要结论
2. **字数控制**：严格控制在800-1000字以内
3. **结构清晰**：使用小标题分段（如：核心要点、关键数据、影响分析等）
4. **客观准确**：保持新闻的客观性，不添加主观评论
5. **易读性**：使用简洁明了的语言，适合快速阅读

**文章信息：**
标题：${title}
来源：${source}

**原文内容：**
${articleContent}

请直接输出摘要，无需添加"摘要："等前缀。`;

  const requestData = JSON.stringify({
    model: DEEPSEEK_MODEL,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    max_tokens: 2000,
    temperature: 0.7,
    stream: false
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.deepseek.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Length': Buffer.byteLength(requestData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const response = JSON.parse(data);
            const summary = response.choices?.[0]?.message?.content || '';
            
            if (summary) {
              resolve(summary.trim());
            } else {
              console.error('❌ DeepSeek API返回空内容');
              resolve(null);
            }
          } else {
            console.error(`❌ DeepSeek API错误 (${res.statusCode}):`, data);
            resolve(null);
          }
        } catch (err) {
          console.error('❌ 解析API响应失败:', err.message);
          resolve(null);
        }
      });
    });

    req.on('error', (err) => {
      console.error('❌ API请求失败:', err.message);
      resolve(null);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      console.error('❌ API请求超时');
      resolve(null);
    });

    req.write(requestData);
    req.end();
  });
}

/**
 * 从HTML中提取纯文本内容
 */
function extractTextFromHTML(html) {
  if (!html) return '';
  
  try {
    const $ = cheerio.load(html);
    
    // 移除脚本、样式等无关标签
    $('script, style, iframe, noscript').remove();
    
    // 提取正文
    let text = $('body').text() || $.text();
    
    // 清理多余空白
    text = text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
    
    return text;
  } catch (err) {
    console.error('⚠️ HTML解析失败:', err.message);
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

/**
 * 抓取完整文章内容（通过原文链接）
 */
async function fetchFullArticle(url) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RSS-Aggregator/1.0)'
        }
      };

      const protocol = urlObj.protocol === 'https:' ? https : require('http');
      
      const req = protocol.request(options, (res) => {
        let html = '';

        res.on('data', (chunk) => {
          html += chunk;
        });

        res.on('end', () => {
          const text = extractTextFromHTML(html);
          resolve(text);
        });
      });

      req.on('error', (err) => {
        console.error(`⚠️ 抓取文章失败 (${url}):`, err.message);
        resolve('');
      });

      req.setTimeout(10000, () => {
        req.destroy();
        resolve('');
      });

      req.end();
    } catch (err) {
      console.error(`⚠️ URL解析失败 (${url}):`, err.message);
      resolve('');
    }
  });
}

/**
 * 生成文章摘要（主函数）
 */
async function generateSummary(article) {
  try {
    console.log(`📝 正在生成摘要: ${article.title.substring(0, 30)}...`);

    // 1. 准备文章内容
    let articleContent = article.content || article.description || '';
    
    // 2. 如果RSS内容不足，尝试抓取完整文章
    if (articleContent.length < 500 && article.link) {
      console.log('   📡 RSS内容较短，尝试抓取完整文章...');
      const fullContent = await fetchFullArticle(article.link);
      if (fullContent && fullContent.length > articleContent.length) {
        articleContent = fullContent;
      }
    }

    // 3. 清理HTML标签
    articleContent = extractTextFromHTML(articleContent);

    // 4. 内容长度检查
    if (articleContent.length < 200) {
      console.log('   ⚠️ 内容过短，跳过摘要生成');
      return null;
    }

    // 5. 限制输入长度（DeepSeek支持更长上下文，但为了成本考虑）
    if (articleContent.length > 20000) {
      articleContent = articleContent.substring(0, 20000) + '...';
    }

    // 6. 调用DeepSeek API生成摘要
    const summary = await callDeepSeekAPI(
      articleContent,
      article.title,
      article.source
    );

    if (summary) {
      console.log(`   ✅ 摘要生成成功 (${summary.length}字)`);
      return summary;
    } else {
      console.log('   ⚠️ 摘要生成失败');
      return null;
    }

  } catch (err) {
    console.error(`❌ 生成摘要异常:`, err.message);
    return null;
  }
}

/**
 * 批量生成摘要（带延迟，避免API限流）
 */
async function batchGenerateSummaries(articles, delayMs = 500) {
  const results = [];
  
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    
    // 检查是否已有摘要
    if (article.summary) {
      console.log(`⏭️  已有摘要，跳过: ${article.title.substring(0, 30)}...`);
      results.push({ id: article.id, summary: article.summary });
      continue;
    }

    // 生成摘要
    const summary = await generateSummary(article);
    
    if (summary) {
      results.push({ id: article.id, summary });
    }

    // 延迟（DeepSeek限流较宽松，可以设置更短）
    if (i < articles.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

module.exports = {
  generateSummary,
  batchGenerateSummaries,
  extractTextFromHTML
};
