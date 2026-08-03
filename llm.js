const https = require('https');

const MODEL = 'deepseek-v4-flash';

/**
 * 通用 LLM 调用（DeepSeek，OpenAI兼容接口）
 * @param {Object} opts
 * @param {string} opts.system - system prompt
 * @param {string} opts.user - user prompt
 * @param {number} [opts.maxTokens]
 * @param {number} [opts.temperature]
 * @returns {Promise<string>} 模型返回的文本内容
 */
async function callLLM({ system, user, maxTokens = 1500, temperature = 0.7 }) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('缺少 DEEPSEEK_API_KEY 环境变量，请在服务器配置 DeepSeek API Key');
  }

  const requestBody = JSON.stringify({
    model: MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    temperature,
    max_tokens: maxTokens
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.deepseek.com',
        path: '/v1/chat/completions',
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
              return reject(new Error(`DeepSeek API错误: ${json.error.message || JSON.stringify(json.error)}`));
            }
            const content = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
            if (!content) {
              return reject(new Error(`DeepSeek返回空结果${res.statusCode !== 200 ? `（HTTP ${res.statusCode}）: ${data}` : ''}`));
            }
            resolve(content.trim());
          } catch (e) {
            reject(new Error(`解析API响应失败: ${e.message}`));
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

/**
 * 生成文章摘要
 * @param {Object} article - {title, content, description}
 * @returns {Promise<string>}
 */
async function generateArticleSummary(article) {
  const rawContent = article.content || article.description || '';
  const cleanContent = rawContent.replace(/<[^>]+>/g, '').trim().substring(0, 3000);
  const prompt = `请对以下文章生成一段1000字以内的核心内容摘要，用中文输出，重点提炼关键信息、核心观点和重要数据，语言简洁专业：\n\n标题：${article.title}\n\n内容：${cleanContent || '（无正文，请仅根据标题推断摘要）'}`;

  return callLLM({
    system: '你是一名专业的AI行业分析师，擅长将复杂的技术文章提炼成简洁易懂的核心摘要，帮助读者快速掌握文章要点。',
    user: prompt,
    maxTokens: 1500
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
 * 把英文文章标题+正文翻译成中文，保留分段
 * @param {Object} article - {title, content, description}
 * @returns {Promise<{title: string, content: string}>}
 */
async function translateArticleToChinese(article) {
  const rawContent = article.content || article.description || '';
  const cleanContent = htmlToParagraphs(rawContent).substring(0, 4000);
  const prompt = `标题：${article.title}\n\n正文：${cleanContent || '（无正文）'}`;

  const text = await callLLM({
    system: '你是专业的科技新闻翻译，把英文文章准确、流畅地翻译成中文，保留原文的段落结构和信息，不要遗漏内容，不要添加评论或解释。严格按以下格式输出，不要有多余内容：\n标题：<翻译后的标题>\n正文：\n<翻译后的正文，段落之间用一个空行分隔>',
    user: prompt,
    maxTokens: 2000
  });

  const titleMatch = text.match(/标题[：:]\s*(.+)/);
  const bodyMatch = text.match(/正文[：:]\s*\n?([\s\S]*)/);

  return {
    title: titleMatch ? titleMatch[1].trim() : article.title,
    content: bodyMatch ? bodyMatch[1].trim() : text.replace(/^标题[：:].*\n?/, '').trim()
  };
}

module.exports = { callLLM, generateArticleSummary, translateArticleToChinese };
