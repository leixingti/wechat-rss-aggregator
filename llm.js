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

module.exports = { callLLM };
