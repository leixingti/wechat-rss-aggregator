#!/usr/bin/env node
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');

const CONFIG = {
  db: '/data/articles.db',
  email: {
    from: 'leixingti@gmail.com',
    to: 'wade_wang@hotmail.com',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    user: 'leixingti@gmail.com',
    pass: 'tbvxdanmsjmjwzig',
  },
};

function fetchFeatured() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(CONFIG.db, sqlite3.OPEN_READONLY);
    db.all(
      `SELECT title, link, source, featured_rank
       FROM articles
       WHERE is_featured = 1
       ORDER BY featured_rank ASC`,
      (err, rows) => { db.close(); if (err) return reject(err); resolve(rows || []); }
    );
  });
}

function buildHtml(articles, now) {
  const timeStr = now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
  const rows = articles.map(a =>
    `<tr>
      <td style="padding:8px 6px;border-bottom:1px solid #f0f0f0;color:#3b82f6;font-weight:600;font-size:13px;vertical-align:top;">${a.featured_rank}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #f0f0f0;color:#888;font-size:13px;white-space:nowrap;vertical-align:top;">${a.source}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #f0f0f0;">
        <a href="${a.link}" style="color:#1e3a5f;text-decoration:none;font-size:14px;line-height:1.4;">${a.title}</a>
      </td>
    </tr>`
  ).join('');
  const emptyMsg = articles.length === 0
    ? '<p style="text-align:center;color:#888;font-size:16px;padding:40px 0;">☕ 今天AI精选暂无内容</p>' : '';
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:'PingFang SC','Microsoft YaHei',sans-serif;max-width:800px;margin:0 auto;padding:24px;background:#f9f9f9;">
  <div style="background:#fff;border-radius:10px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.06);">
    <div style="border-bottom:3px solid #3b82f6;padding-bottom:16px;margin-bottom:24px;">
      <h1 style="margin:0;font-size:24px;color:#1e3a5f;">🤖 AI精选日报</h1>
      <p style="margin:6px 0 0;color:#888;font-size:14px;">${timeStr} · 过去24小时最重要的AI新闻 · 共 ${articles.length} 条</p>
    </div>
    ${emptyMsg}
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
    <p style="margin-top:24px;font-size:12px;color:#bbb;text-align:center;">由服务器自动生成</p>
  </div>
</body></html>`;
}

async function main() {
  const now = new Date();
  console.log(`[${now.toISOString()}] 开始生成AI精选日报...`);

  const articles = await fetchFeatured();
  console.log(`找到当日AI精选 ${articles.length} 条`);

  console.log('发送邮件...');
  const transporter = nodemailer.createTransport({ host: CONFIG.email.smtpHost, port: CONFIG.email.smtpPort, secure: false, auth: { user: CONFIG.email.user, pass: CONFIG.email.pass } });
  const dateStr = now.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
  await transporter.sendMail({
    from: `"AI精选日报" <${CONFIG.email.from}>`,
    to: CONFIG.email.to,
    subject: `🤖 AI精选日报 ${dateStr}（共 ${articles.length} 条）`,
    html: buildHtml(articles, now)
  });
  console.log(`✅ 邮件已发送至 ${CONFIG.email.to}`);
}

main().catch(e => { console.error(e); process.exit(1); });
