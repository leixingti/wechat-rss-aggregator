// AI翻译服务 - 使用Anthropic Claude API

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * 检测文本语言
 * @param {string} text - 要检测的文本
 * @returns {string} - 'en' 或 'zh'
 */
function detectLanguage(text) {
  if (!text) return 'zh';
  
  // 简单的语言检测：如果包含中文字符，认为是中文
  const chineseRegex = /[\u4e00-\u9fa5]/;
  return chineseRegex.test(text) ? 'zh' : 'en';
}

/**
 * 使用Claude API翻译文本
 * @param {string} text - 要翻译的文本
 * @param {string} sourceLang - 源语言 ('en' 或 'zh')
 * @param {string} targetLang - 目标语言 ('en' 或 'zh')
 * @returns {Promise<string>} - 翻译后的文本
 */
async function translateWithClaude(text, sourceLang = 'en', targetLang = 'zh') {
  try {
    // 如果源语言和目标语言相同，直接返回
    if (sourceLang === targetLang) {
      return text;
    }

    // 构建翻译提示词
    const prompt = targetLang === 'zh' 
      ? `请将以下英文翻译成简体中文，保持专业性和准确性。只返回翻译结果，不要添加任何解释或额外内容：\n\n${text}`
      : `Please translate the following Chinese text to English, maintaining professionalism and accuracy. Return only the translation without any explanations:\n\n${text}`;

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      console.error('翻译API请求失败:', response.status);
      return text; // 失败时返回原文
    }

    const data = await response.json();
    
    // 提取翻译结果
    if (data.content && data.content[0] && data.content[0].text) {
      return data.content[0].text.trim();
    }

    return text; // 如果无法提取结果，返回原文
  } catch (error) {
    console.error('翻译过程出错:', error);
    return text; // 出错时返回原文
  }
}

/**
 * 批量翻译文章列表
 * @param {Array} articles - 文章数组
 * @returns {Promise<Array>} - 翻译后的文章数组
 */
async function translateArticles(articles) {
  if (!articles || articles.length === 0) {
    return articles;
  }

  const translatedArticles = [];

  for (const article of articles) {
    try {
      // 检测标题语言
      const titleLang = detectLanguage(article.title);
      
      // 检测描述语言
      const descLang = detectLanguage(article.description);

      // 只翻译英文内容
      const translatedArticle = { ...article };

      if (titleLang === 'en') {
        translatedArticle.title_zh = await translateWithClaude(article.title, 'en', 'zh');
        translatedArticle.title_en = article.title;
      } else {
        translatedArticle.title_zh = article.title;
      }

      if (descLang === 'en' && article.description) {
        translatedArticle.description_zh = await translateWithClaude(article.description, 'en', 'zh');
        translatedArticle.description_en = article.description;
      } else {
        translatedArticle.description_zh = article.description;
      }

      // 标记语言
      translatedArticle.original_language = titleLang;

      translatedArticles.push(translatedArticle);

      // 避免API请求过快，添加小延迟
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`翻译文章失败 [${article.title}]:`, error);
      // 失败时保留原文
      translatedArticles.push(article);
    }
  }

  return translatedArticles;
}

/**
 * 智能翻译：只翻译标题，节省API调用
 * @param {string} title - 标题
 * @param {string} description - 描述（可选）
 * @returns {Promise<Object>} - {title_zh, description_zh, original_language}
 */
async function smartTranslate(title, description = '') {
  const titleLang = detectLanguage(title);
  const result = {
    title_zh: title,
    title_en: titleLang === 'en' ? title : '',
    description_zh: description,
    description_en: '',
    original_language: titleLang
  };

  // 只翻译英文内容
  if (titleLang === 'en') {
    result.title_zh = await translateWithClaude(title, 'en', 'zh');
    
    // 描述太长会消耗大量token，可选择性翻译
    if (description && description.length < 300) {
      const descLang = detectLanguage(description);
      if (descLang === 'en') {
        result.description_zh = await translateWithClaude(description, 'en', 'zh');
        result.description_en = description;
      }
    }
  }

  return result;
}

module.exports = {
  detectLanguage,
  translateWithClaude,
  translateArticles,
  smartTranslate
};
