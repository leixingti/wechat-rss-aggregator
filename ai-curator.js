const https = require('https');
const db = require('./database');

const CANDIDATE_WINDOW_HOURS = 24;
const MAX_PER_SOURCE = 8;
const MAX_CANDIDATES = 200;
const TOP_N = 50;

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function normalizeTitle(title) {
  return (title || '')
    .toLowerCase()
    .replace(/[^一-鿿a-z0-9]/g, '')
    .trim();
}

// rows 需按 createdAt DESC 传入，同标题只保留最新一条
function dedupeByTitle(rows) {
  const seen = new Set();
  const result = [];
  for (const row of rows) {
    const key = normalizeTitle(row.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(row);
  }
  return result;
}

function capPerSource(rows, maxPerSource) {
  const countBySource = new Map();
  const result = [];
  for (const row of rows) {
    const src = row.source || '';
    const count = countBySource.get(src) || 0;
    if (count >= maxPerSource) continue;
    countBySource.set(src, count + 1);
    result.push(row);
  }
  return result;
}

async function getCandidatePool() {
  return dbAll(
    `SELECT id, title, description, source, createdAt FROM articles
     WHERE category = 'ai_news' AND datetime(createdAt) >= datetime('now', ?)
     ORDER BY createdAt DESC`,
    [`-${CANDIDATE_WINDOW_HOURS} hours`]
  );
}

function buildCandidateListText(candidates) {
  return candidates
    .map((c, i) => {
      const desc = (c.description || '').replace(/<[^>]+>/g, '').trim().substring(0, 120);
      return `${i + 1}. [${c.source || '未知来源'}] ${c.title}${desc ? ' - ' + desc : ''}`;
    })
    .join('\n');
}

async function rankAndSelect(candidates) {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error('缺少 DASHSCOPE_API_KEY 环境变量');

  const systemPrompt = `你是全球AI行业资讯编辑。下面是过去24小时内抓取到的AI相关新闻候选列表，可能包含很多来源报道同一件事的重复新闻。请你：
1. 识别报道同一事件的不同来源，只保留其中最具代表性、信息最完整的一条；
2. 对去重后的新闻按全球重要性从高到低排序；
3. 选出最重要的最多${TOP_N}条。
严格只返回如下格式的JSON，不要有任何其他文字、解释或markdown代码块标记：
{"selected": [编号1, 编号2, ...]}
编号必须是候选列表里的序号（从1开始），按重要性从高到低排列，最多${TOP_N}个。`;

  const requestBody = JSON.stringify({
    model: 'qwen-turbo-latest',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: buildCandidateListText(candidates) }
    ],
    temperature: 0.2,
    max_tokens: 800
  });

  const content = await new Promise((resolve, reject) => {
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
        timeout: 60000
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) {
              return reject(new Error(`通义千问API错误: ${json.error.message || JSON.stringify(json.error)}`));
            }
            const text = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
            if (!text) return reject(new Error('通义千问返回空结果'));
            resolve(text);
          } catch (e) {
            reject(new Error(`解析API响应失败: ${e.message}`));
          }
        });
      }
    );
    req.on('error', (e) => reject(new Error(`请求失败: ${e.message}`)));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时（60秒）'));
    });
    req.write(requestBody);
    req.end();
  });

  const stripped = content.replace(/```json/gi, '').replace(/```/g, '');
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('无法从LLM响应中提取JSON');
  const parsed = JSON.parse(match[0]);
  if (!Array.isArray(parsed.selected)) throw new Error('LLM响应缺少selected数组');

  const seen = new Set();
  const validIndices = [];
  for (const idx of parsed.selected) {
    const n = Number(idx);
    if (!Number.isInteger(n) || n < 1 || n > candidates.length) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    validIndices.push(n);
    if (validIndices.length >= TOP_N) break;
  }
  if (validIndices.length === 0) throw new Error('LLM未选出任何有效候选');

  return validIndices.map((n) => candidates[n - 1].id);
}

// 降级方案：标题去重后按最新排序取前 TOP_N（LLM调用失败时使用，保证AI板块不留空）
function fallbackSelect(candidates) {
  return candidates.slice(0, TOP_N).map((c) => c.id);
}

async function applySelection(candidatePool, selectedIds) {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });

  // 清空上一轮精选标记
  await dbRun(`UPDATE articles SET is_featured = 0, featured_rank = NULL, featured_date = NULL WHERE is_featured = 1`);

  // 标记本轮入选，category 保持 ai_news 不变
  for (let i = 0; i < selectedIds.length; i++) {
    await dbRun(
      `UPDATE articles SET is_featured = 1, featured_rank = ?, featured_date = ? WHERE id = ?`,
      [i + 1, today, selectedIds[i]]
    );
  }

  // 候选池里没入选的，全部下放到 it_news
  const selectedSet = new Set(selectedIds);
  const loserIds = candidatePool.map((c) => c.id).filter((id) => !selectedSet.has(id));
  if (loserIds.length > 0) {
    const placeholders = loserIds.map(() => '?').join(',');
    await dbRun(`UPDATE articles SET category = 'it_news' WHERE id IN (${placeholders})`, loserIds);
  }
  return loserIds.length;
}

async function runDailyAIFocusCuration() {
  const rawPool = await getCandidatePool();
  const candidatePoolSize = rawPool.length;

  if (candidatePoolSize === 0) {
    return { candidatePoolSize: 0, prefilteredCount: 0, selectedCount: 0, demotedCount: 0, usedFallback: false, error: null };
  }

  const deduped = dedupeByTitle(rawPool);
  const prefiltered = capPerSource(deduped, MAX_PER_SOURCE).slice(0, MAX_CANDIDATES);

  let selectedIds;
  let usedFallback = false;
  let error = null;

  try {
    selectedIds = await rankAndSelect(prefiltered);
  } catch (e) {
    console.error('❌ AI精选LLM排序失败，使用降级方案:', e.message);
    error = e.message;
    usedFallback = true;
    selectedIds = fallbackSelect(prefiltered);
  }

  const demotedCount = await applySelection(rawPool, selectedIds);

  return {
    candidatePoolSize,
    prefilteredCount: prefiltered.length,
    selectedCount: selectedIds.length,
    demotedCount,
    usedFallback,
    error
  };
}

module.exports = { runDailyAIFocusCuration };
