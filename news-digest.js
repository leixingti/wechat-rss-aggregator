#!/usr/bin/env node
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
const https = require('https');

const CONFIG = {
  db: '/data/articles.db',
  apiKey: process.env.DASHSCOPE_API_KEY || 'sk-2f7a786dd0634e53b73caa78a1b1fcd5',
  email: {
    from: 'leixingti@gmail.com',
    to: 'wade_wang@hotmail.com',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    user: 'leixingti@gmail.com',
    pass: 'tbvxdanmsjmjwzig',
  },
  lookbackHours: (() => { const i = process.argv.indexOf('--hours'); return i !== -1 ? parseInt(process.argv[i + 1]) : 2; })(),
};

function isMainlyEnglish(text) {
  if (!text) return false;
  const clean = text.replace(/[^a-zA-Z\u4e00-\u9fff]/g, '');
  if (clean.length === 0) return false;
  return clean.replace(/[^a-zA-Z]/g, '').length / clean.length > 0.5;
}

function batchTranslate(titles) {
  const numbered = titles.map((t, i) => `${i + 1}. ${t}`).join('\n');
  const body = JSON.stringify({
    model: 'qwen-turbo-latest',
    messages: [
      { role: 'system', content: '你是专业翻译。将以下编号的英文标题逐条翻译为简洁的中文。保持编号格式，每行一条，只输出翻译结果。' },
      { role: 'user', content: numbered }
    ],
    max_tokens: 2000
  });
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'dashscope.aliyuncs.com',
      path: '/compatible-mode/v1/chat/completions',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CONFIG.apiKey}`, 'Content-Length': Buffer.byteLength(body) },
      timeout: 30000
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.message?.content?.trim();
          if (content) {
            const lines = content.split('\n').filter(l => l.trim());
            const result = {};
            lines.forEach(line => {
              const m = line.match(/^(\d+)\.\s*(.+)/);
              if (m) result[parseInt(m[1]) - 1] = m[2].trim();
            });
            resolve(result);
          } else resolve({});
        } catch { resolve({}); }
      });
    });
    req.on('error', () => resolve({}));
    req.on('timeout', () => { req.destroy(); resolve({}); });
    req.write(body);
    req.end();
  });
}

async function translateArticles(articles) {
  // 找出英文标题的索引
  const englishIndices = [];
  articles.forEach((a, i) => { if (isMainlyEnglish(a.title)) englishIndices.push(i); });
  if (englishIndices.length === 0) return articles;

  console.log(`  翻译 ${englishIndices.length} 个英文标题...`);

  // 分批翻译，每批20个
  for (let b = 0; b < englishIndices.length; b += 20) {
    const batchIndices = englishIndices.slice(b, b + 20);
    const batchTitles = batchIndices.map(i => articles[i].title);
    const translated = await batchTranslate(batchTitles);
    batchIndices.forEach((articleIdx, batchIdx) => {
      if (translated[batchIdx]) {
        articles[articleIdx].title = translated[batchIdx];
      }
    });
    if (b + 20 < englishIndices.length) await new Promise(r => setTimeout(r, 300));
  }
  return articles;
}

function fetchByCategory(category) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(CONFIG.db, sqlite3.OPEN_READONLY);
    db.all(
      `SELECT title, link, source, category
       FROM articles
       WHERE category = ?
         AND datetime(createdAt) >= datetime('now', '-' || ? || ' hours')
       ORDER BY createdAt DESC`,
      [category, CONFIG.lookbackHours],
      (err, rows) => { db.close(); if (err) return reject(err); resolve(rows || []); }
    );
  });
}

function buildSection(title, color, icon, articles) {
  if (articles.length === 0) return '';
  const rows = articles.map(a =>
    `<tr>
      <td style="padding:8px 6px;border-bottom:1px solid #f0f0f0;color:#888;font-size:13px;white-space:nowrap;">${a.source}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #f0f0f0;">
        <a href="${a.link}" style="color:${color};text-decoration:none;font-size:14px;line-height:1.4;">${a.title}</a>
      </td>
    </tr>`
  ).join('');
  return `
    <div style="margin-bottom:28px;">
      <div style="border-bottom:2px solid ${color};padding-bottom:10px;margin-bottom:12px;">
        <h2 style="margin:0;font-size:18px;color:${color};">${icon} ${title}（${articles.length}条）</h2>
      </div>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
    </div>`;
}

function buildHtml(aiArticles, itArticles, weiboArticles, now) {
  const timeStr = now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
  const totalCount = aiArticles.length + itArticles.length + weiboArticles.length;
  const emptyMsg = totalCount === 0
    ? '<p style="text-align:center;color:#888;font-size:16px;padding:40px 0;">☕ 暂无新内容，一切风平浪静</p>' : '';
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:'PingFang SC','Microsoft YaHei',sans-serif;max-width:800px;margin:0 auto;padding:24px;background:#f9f9f9;">
  <div style="background:#fff;border-radius:10px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.06);">
    <div style="border-bottom:3px solid #3b82f6;padding-bottom:16px;margin-bottom:24px;">
      <h1 style="margin:0;font-size:24px;color:#1e3a5f;">📰 IT行业动态简报</h1>
      <p style="margin:6px 0 0;color:#888;font-size:14px;">${timeStr} · 过去${CONFIG.lookbackHours}小时 · 共 ${totalCount} 条</p>
    </div>
    ${emptyMsg}
    ${buildSection('聚焦AI行业', '#3b82f6', '🤖', aiArticles)}
    ${buildSection('IT行业新闻', '#0ea5e9', '💻', itArticles)}
    ${buildSection('社媒动态', '#f97316', '📱', weiboArticles)}
    <p style="margin-top:24px;font-size:12px;color:#bbb;text-align:center;">由服务器自动生成</p>
  </div>
</body></html>`;
}

async function main() {
  const now = new Date();
  console.log(`[${now.toISOString()}] 开始生成IT简报...`);

  let [aiArticles, itArticles, weiboArticles] = await Promise.all([
    fetchByCategory('ai_news').catch(() => []),
    fetchByCategory('it_news').catch(() => []),
    fetchByCategory('weibo').catch(() => []),
  ]);

  const totalCount = aiArticles.length + itArticles.length + weiboArticles.length;
  if (totalCount === 0) { console.log('无新文章，发送空报告邮件...'); }
  console.log(`找到 AI ${aiArticles.length} + IT ${itArticles.length} + 社媒 ${weiboArticles.length} = ${totalCount} 条`);

  // 翻译所有板块中的英文标题
  aiArticles = await translateArticles(aiArticles);
  itArticles = await translateArticles(itArticles);
  weiboArticles = await translateArticles(weiboArticles);

  console.log('发送邮件...');
  const transporter = nodemailer.createTransport({ host: CONFIG.email.smtpHost, port: CONFIG.email.smtpPort, secure: false, auth: { user: CONFIG.email.user, pass: CONFIG.email.pass } });
  const dateStr = now.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const timeStr = now.toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false });
  await transporter.sendMail({
    from: `"IT简报" <${CONFIG.email.from}>`,
    to: CONFIG.email.to,
    subject: `📰 IT简报 ${dateStr} ${timeStr}（AI ${aiArticles.length} + IT ${itArticles.length} + 社媒 ${weiboArticles.length}）`,
    html: buildHtml(aiArticles, itArticles, weiboArticles, now)
  });
  console.log(`✅ 邮件已发送至 ${CONFIG.email.to}`);
}

main().catch(e => { console.error(e); process.exit(1); });
