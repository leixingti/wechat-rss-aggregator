#!/usr/bin/env node
const sqlite3 = require('sqlite3').verbose();
const https = require('https');

const DB_PATH = '/data/articles.db';
const API_KEY = process.env.DASHSCOPE_API_KEY;

if (!API_KEY) { console.error('Missing DASHSCOPE_API_KEY'); process.exit(1); }

function isMainlyEnglish(text) {
  if (!text) return false;
  const clean = text.replace(/[^a-zA-Z\u4e00-\u9fff]/g, '');
  if (clean.length === 0) return false;
  const englishChars = clean.replace(/[^a-zA-Z]/g, '').length;
  return englishChars / clean.length > 0.5;
}

function translate(title, desc) {
  const textToTranslate = `标题: ${title}\n摘要: ${(desc || '').substring(0, 500)}`;
  const body = JSON.stringify({
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
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}`, 'Content-Length': Buffer.byteLength(body) },
      timeout: 15000
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.message?.content?.trim();
          if (content) {
            const lines = content.split('\n').filter(l => l.trim());
            resolve({ title: lines[0] || title, description: lines.slice(1).join(' ') || desc });
          } else resolve(null);
        } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.write(body);
    req.end();
  });
}

async function main() {
  const db = new sqlite3.Database(DB_PATH);
  const rows = await new Promise((resolve, reject) => {
    db.all("SELECT id, title, description FROM articles WHERE category = 'weibo'", (e, r) => e ? reject(e) : resolve(r));
  });

  const englishRows = rows.filter(r => isMainlyEnglish(r.title));
  console.log(`Found ${englishRows.length} English articles out of ${rows.length} weibo articles`);

  let translated = 0;
  for (const row of englishRows) {
    const result = await translate(row.title, row.description);
    if (result) {
      await new Promise((resolve, reject) => {
        db.run("UPDATE articles SET title = ?, description = ? WHERE id = ?",
          [result.title, result.description, row.id], e => e ? reject(e) : resolve());
      });
      translated++;
      if (translated % 10 === 0) console.log(`Translated ${translated}/${englishRows.length}...`);
    }
    // Rate limit: 200ms between calls
    await new Promise(r => setTimeout(r, 200));
  }
  console.log(`Done. Translated ${translated} articles.`);
  db.close();
}

main().catch(e => { console.error(e); process.exit(1); });
