const https = require('https');

/**
 * 调用通义千问 API 生成文章摘要
 * @param {Object} article - 文章对象 {title, content, description}
 * @returns {Promise<string>} 生成的摘要文本
 */
async function generateQianwenSummary(article) {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error('缺少 DASHSCOPE_API_KEY 环境变量，请在服务器配置通义千问 API Key');
  }

  const rawContent = article.content || article.description || '';
  // 清理 HTML 标签，截取前 3000 字
  const cleanContent = rawContent.replace(/<[^>]+>/g, '').trim().substring(0, 3000);

  const prompt = `请对以下文章生成一段1000字以内的核心内容摘要，用中文输出，重点提炼关键信息、核心观点和重要数据，语言简洁专业：\n\n标题：${article.title}\n\n内容：${cleanContent || '（无正文，请仅根据标题推断摘要）'}`;

  const requestBody = JSON.stringify({
    model: 'qwen-turbo-latest',
    messages: [
      {
        role: 'system',
        content: '你是一名专业的AI行业分析师，擅长将复杂的技术文章提炼成简洁易懂的核心摘要，帮助读者快速掌握文章要点。'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 1500
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'dashscope.aliyuncs.com',
        path: '/compatible-mode/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(requestBody)
        },
        timeout: 30000
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) {
              return reject(new Error(`通义千问 API 错误: ${json.error.message || JSON.stringify(json.error)}`));
            }
            const summary = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
            if (!summary) {
              return reject(new Error('通义千问返回空摘要'));
            }
            resolve(summary.trim());
          } catch (e) {
            reject(new Error(`解析 API 响应失败: ${e.message}`));
          }
        });
      }
    );

    req.on('error', (e) => reject(new Error(`请求失败: ${e.message}`)));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时（30秒）'));
    });

    req.write(requestBody);
    req.end();
  });
}

// 把HTML转成保留段落结构的纯文本（<p>/<div>/<br>处换行，其余标签去掉）
function htmlToParagraphs(html) {
  if (!html) return '';
  return html
    .replace(/<\/(p|div|h[1-6])>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * 调用通义千问把英文文章标题+正文翻译成中文，保留分段
 * @param {Object} article - 文章对象 {title, content, description}
 * @returns {Promise<{title: string, content: string}>}
 */
async function translateArticleToChinese(article) {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error('缺少 DASHSCOPE_API_KEY 环境变量，请在服务器配置通义千问 API Key');
  }

  const rawContent = article.content || article.description || '';
  const cleanContent = htmlToParagraphs(rawContent).substring(0, 4000);

  const prompt = `标题：${article.title}\n\n正文：${cleanContent || '（无正文）'}`;

  const requestBody = JSON.stringify({
    model: 'qwen-turbo-latest',
    messages: [
      {
        role: 'system',
        content: '你是专业的科技新闻翻译，把英文文章准确、流畅地翻译成中文，保留原文的段落结构和信息，不要遗漏内容，不要添加评论或解释。严格按以下格式输出，不要有多余内容：\n标题：<翻译后的标题>\n正文：\n<翻译后的正文，段落之间用一个空行分隔>'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 2000
  });

  const text = await new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'dashscope.aliyuncs.com',
        path: '/compatible-mode/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(requestBody)
        },
        timeout: 30000
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) {
              return reject(new Error(`通义千问 API 错误: ${json.error.message || JSON.stringify(json.error)}`));
            }
            const content = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
            if (!content) {
              return reject(new Error('通义千问返回空结果'));
            }
            resolve(content.trim());
          } catch (e) {
            reject(new Error(`解析 API 响应失败: ${e.message}`));
          }
        });
      }
    );

    req.on('error', (e) => reject(new Error(`请求失败: ${e.message}`)));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时（30秒）'));
    });

    req.write(requestBody);
    req.end();
  });

  const titleMatch = text.match(/标题[：:]\s*(.+)/);
  const bodyMatch = text.match(/正文[：:]\s*\n?([\s\S]*)/);

  return {
    title: titleMatch ? titleMatch[1].trim() : article.title,
    content: bodyMatch ? bodyMatch[1].trim() : text.replace(/^标题[：:].*\n?/, '').trim()
  };
}

module.exports = { generateQianwenSummary, translateArticleToChinese };
