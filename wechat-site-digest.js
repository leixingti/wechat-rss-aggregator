#!/usr/bin/env node
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');

const CONFIG = {
  db: '/home/ubuntu/web-site-my-wechat/articles.db',
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

function fetchRecentArticles() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(CONFIG.db, sqlite3.OPEN_READONLY);
    db.all(
      `SELECT title, link, source
       FROM articles
       WHERE datetime(createdAt) >= datetime('now', '-' || ? || ' hours')
       ORDER BY createdAt DESC`,
      [CONFIG.lookbackHours],
      (err, rows) => { db.close(); if (err) return reject(err); resolve(rows || []); }
    );
  });
}

function buildHtml(articles, now) {
  const timeStr = now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
  if (articles.length === 0) {
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:'PingFang SC','Microsoft YaHei',sans-serif;max-width:800px;margin:0 auto;padding:24px;background:#f9f9f9;">
  <div style="background:#fff;border-radius:10px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.06);">
    <div style="border-bottom:3px solid #10b981;padding-bottom:16px;margin-bottom:24px;">
      <h1 style="margin:0;font-size:24px;color:#10b981;">📬 微信公众号精选</h1>
      <p style="margin:6px 0 0;color:#888;font-size:14px;">${timeStr} · 过去${CONFIG.lookbackHours}小时</p>
    </div>
    <p style="text-align:center;color:#888;font-size:16px;padding:40px 0;">☕ 暂无新内容，一切风平浪静</p>
    <p style="margin-top:24px;font-size:12px;color:#bbb;text-align:center;">由服务器自动生成</p>
  </div>
</body></html>`;
  }
  const items = articles.map(a => `<tr>
    <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;color:#888;font-size:14px;white-space:nowrap;">${a.source}</td>
    <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;">
      <a href="${a.link}" style="color:#10b981;text-decoration:none;font-size:15px;line-height:1.5;">${a.title}</a>
    </td>
  </tr>`).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:'PingFang SC','Microsoft YaHei',sans-serif;max-width:800px;margin:0 auto;padding:24px;background:#f9f9f9;">
  <div style="background:#fff;border-radius:10px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.06);">
    <div style="border-bottom:3px solid #10b981;padding-bottom:16px;margin-bottom:24px;">
      <h1 style="margin:0;font-size:24px;color:#10b981;">📬 微信公众号精选</h1>
      <p style="margin:6px 0 0;color:#888;font-size:14px;">${timeStr} · 过去${CONFIG.lookbackHours}小时 · 共 ${articles.length} 篇</p>
    </div>
    <table style="width:100%;border-collapse:collapse;">${items}</table>
    <p style="margin-top:24px;font-size:12px;color:#bbb;text-align:center;">由服务器自动生成</p>
  </div>
</body></html>`;
}

async function main() {
  const now = new Date();
  console.log(`[${now.toISOString()}] 开始生成微信精选...`);
  const articles = await fetchRecentArticles().catch(e => { console.error('查询失败:', e.message); process.exit(1); });
  if (articles.length === 0) { console.log('无新文章，发送空报告邮件...'); }
  console.log(`找到 ${articles.length} 篇文章，发送邮件...`);
  const transporter = nodemailer.createTransport({ host: CONFIG.email.smtpHost, port: CONFIG.email.smtpPort, secure: false, auth: { user: CONFIG.email.user, pass: CONFIG.email.pass } });
  const dateStr = now.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const timeStr = now.toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false });
  await transporter.sendMail({ from: `"微信精选" <${CONFIG.email.from}>`, to: CONFIG.email.to, subject: `📬 微信精选 ${dateStr} ${timeStr}（${articles.length}篇）`, html: buildHtml(articles, now) });
  console.log(`✅ 邮件已发送至 ${CONFIG.email.to}`);
}

main().catch(e => { console.error(e); process.exit(1); });
