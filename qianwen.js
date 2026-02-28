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

module.exports = { generateQianwenSummary };
