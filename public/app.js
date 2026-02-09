// ========================================
// 全局状态
// ========================================

let currentTab = 'ai_news'; // 当前激活的Tab
let currentPage = 1;
let currentSearch = '';
const ARTICLES_PER_PAGE = 100;
let allArticles = [];
let allConferences = [];

// ========================================
// DOM 元素
// ========================================

const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');
const articlesGrid = document.getElementById('articlesGrid');
const itArticlesGrid = document.getElementById('itArticlesGrid');
const conferencesList = document.getElementById('conferencesList');
const pagination = document.getElementById('pagination');
const itPagination = document.getElementById('itPagination');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const refreshBtn = document.getElementById('refreshBtn');

// ========================================
// 初始化
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadContent(currentTab);
  setupEventListeners();
});

function setupEventListeners() {
  // Tab切换
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });

  // 搜索
  searchBtn.addEventListener('click', handleSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });

  // 刷新
  refreshBtn.addEventListener('click', handleRefresh);
}

// ========================================
// Tab 切换
// ========================================

function switchTab(tab) {
  currentTab = tab;
  currentPage = 1;
  
  // 更新Tab按钮状态
  tabBtns.forEach(btn => {
    if (btn.dataset.tab === tab) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // 更新面板显示
  tabPanels.forEach(panel => {
    panel.classList.remove('active');
  });
  
  if (tab === 'ai_news') {
    document.getElementById('ai-news-panel').classList.add('active');
  } else if (tab === 'it_news') {
    document.getElementById('it-news-panel').classList.add('active');
  } else if (tab === 'conferences') {
    document.getElementById('conferences-panel').classList.add('active');
  }
  
  // 加载对应内容
  loadContent(tab);
}

// ========================================
// 加载内容
// ========================================

function loadContent(tab) {
  if (tab === 'conferences') {
    loadConferences();
  } else {
    loadArticlesByCategory(tab);
  }
}

// 加载文章（按分类）
async function loadArticlesByCategory(category) {
  showLoading();
  hideError();

  try {
    // 使用原有的API，加载所有文章
    const response = await fetch(`/api/articles?page=1&limit=1000`);
    
    if (!response.ok) {
      throw new Error('加载失败');
    }

    const data = await response.json();
    
    // 在前端按分类筛选
    if (category === 'ai_news' || category === 'it_news') {
      allArticles = data.articles.filter(article => {
        // 如果文章有category字段，按category筛选
        // 如果没有category字段，默认归为ai_news
        const articleCategory = article.category || 'ai_news';
        return articleCategory === category;
      });
    } else {
      // conferences板块不需要筛选
      allArticles = data.articles;
    }
    
    const targetGrid = category === 'ai_news' ? articlesGrid : itArticlesGrid;
    const targetPagination = category === 'ai_news' ? pagination : itPagination;
    
    displayArticlesGrouped(allArticles, targetGrid, targetPagination);
  } catch (err) {
    showError('加载文章失败，请稍后重试');
    console.error('加载错误:', err);
  } finally {
    hideLoading();
  }
}

// 显示文章列表（按日期分组+分页）
function displayArticlesGrouped(articles, targetGrid, targetPagination) {
  if (articles.length === 0) {
    targetGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
        <p style="font-size: 1.125rem; color: var(--text-secondary);">
          ${currentSearch ? '😔 没有找到匹配的文章' : '📭 暂无文章'}
        </p>
        ${currentTab === 'it_news' ? '<p style="margin-top: 1rem; color: var(--text-secondary);">请在后台添加IT行业RSS源</p>' : ''}
      </div>
    `;
    targetPagination.innerHTML = '';
    return;
  }

  // 按日期分组
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups = {
    today: { title: '今天', articles: [] },
    yesterday: { title: '昨天', articles: [] },
    week: { title: '本周', articles: [] },
    older: { title: '更早', articles: [] }
  };

  articles.forEach(article => {
    const pubDate = new Date(article.pubDate);
    if (pubDate >= today) {
      groups.today.articles.push(article);
    } else if (pubDate >= yesterday) {
      groups.yesterday.articles.push(article);
    } else if (pubDate >= weekAgo) {
      groups.week.articles.push(article);
    } else {
      groups.older.articles.push(article);
    }
  });

  // 计算分页
  const start = (currentPage - 1) * ARTICLES_PER_PAGE;
  const end = start + ARTICLES_PER_PAGE;
  
  // 生成HTML
  let html = '';
  let articleCount = 0;
  
  ['today', 'yesterday', 'week', 'older'].forEach(groupKey => {
    const group = groups[groupKey];
    if (group.articles.length > 0) {
      const groupStart = Math.max(0, start - articleCount);
      const groupEnd = Math.max(0, end - articleCount);
      
      if (groupStart < group.articles.length) {
        html += `
          <div style="grid-column: 1/-1;">
            <h2 class="section-title">${group.title}</h2>
          </div>
        `;
        
        const groupArticles = group.articles.slice(groupStart, groupEnd);
        groupArticles.forEach(article => {
          html += generateArticleCard(article);
        });
      }
      
      articleCount += group.articles.length;
    }
  });

  targetGrid.innerHTML = html;
  
  displayPagination({
    page: currentPage,
    limit: ARTICLES_PER_PAGE,
    total: articles.length,
    totalPages: Math.ceil(articles.length / ARTICLES_PER_PAGE)
  }, targetPagination);
}

function generateArticleCard(article) {
  return `
    <article class="article-card" onclick="openArticle('${escapeHtml(article.link)}')">
      ${article.imageUrl ? `
        <img src="${escapeHtml(article.imageUrl)}" 
             alt="${escapeHtml(article.title)}" 
             class="article-image"
             onerror="this.style.display='none'"
        >
      ` : ''}
      
      <div class="article-content">
        <div class="article-meta">
          <span class="article-source">${escapeHtml(article.source)}</span>
          <span class="article-date">
            📅 ${formatDate(article.pubDate)}
          </span>
        </div>
        
        <h2 class="article-title">${escapeHtml(article.title)}</h2>
        
        <p class="article-description">
          ${escapeHtml(article.description || '暂无摘要')}
        </p>
        
        <div class="article-footer">
          <span class="article-author">
            ✍️ ${escapeHtml(article.source)}
          </span>
          <a href="${escapeHtml(article.link)}" 
             class="read-more" 
             onclick="event.stopPropagation();"
             target="_blank"
             rel="noopener noreferrer"
          >
            阅读原文 →
          </a>
        </div>
      </div>
    </article>
  `;
}

// ========================================
// 加载会议
// ========================================

async function loadConferences() {
  showLoading();
  hideError();

  try {
    const response = await fetch('/api/conferences');
    
    if (!response.ok) {
      throw new Error('加载会议失败');
    }

    const data = await response.json();
    allConferences = data.conferences;
    
    displayConferences(allConferences);
  } catch (err) {
    showError('加载会议失败，请稍后重试');
    console.error('加载错误:', err);
  } finally {
    hideLoading();
  }
}

function displayConferences(conferences) {
  if (conferences.length === 0) {
    conferencesList.innerHTML = `
      <div style="text-align: center; padding: 3rem;">
        <p style="font-size: 1.125rem; color: var(--text-secondary);">暂无会议信息</p>
      </div>
    `;
    return;
  }

  // 按月份分组
  const groupedByMonth = {};
  
  conferences.forEach(conf => {
    const date = new Date(conf.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = `${date.getFullYear()}年${date.getMonth() + 1}月`;
    
    if (!groupedByMonth[monthKey]) {
      groupedByMonth[monthKey] = {
        name: monthName,
        conferences: []
      };
    }
    groupedByMonth[monthKey].conferences.push(conf);
  });

  // 生成HTML
  let html = '';
  
  Object.keys(groupedByMonth).sort().forEach(monthKey => {
    const month = groupedByMonth[monthKey];
    
    html += `
      <div class="month-section">
        <h2 class="month-title">${month.name}（${month.conferences.length}场会议）</h2>
        <div class="conferences-grid">
    `;
    
    month.conferences.forEach(conf => {
      html += generateConferenceCard(conf);
    });
    
    html += `
        </div>
      </div>
    `;
  });

  conferencesList.innerHTML = html;
}

function generateConferenceCard(conf) {
  const startDate = new Date(conf.date);
  const endDate = conf.endDate ? new Date(conf.endDate) : startDate;
  
  const dateStr = conf.endDate && conf.endDate !== conf.date
    ? `${formatConferenceDate(startDate)} - ${formatConferenceDate(endDate)}`
    : formatConferenceDate(startDate);
  
  const typeIcon = conf.type === 'online' ? '💻' : conf.type === 'hybrid' ? '🌐' : '📍';
  const typeText = conf.type === 'online' ? '线上' : conf.type === 'hybrid' ? '线上+线下' : '线下';
  
  return `
    <div class="conference-card">
      <h3 class="conference-title">${escapeHtml(conf.title)}</h3>
      
      <div class="conference-info">
        <div class="conference-info-item">
          <span class="info-icon">📅</span>
          <span>${dateStr}</span>
        </div>
        <div class="conference-info-item">
          <span class="info-icon">${typeIcon}</span>
          <span>${conf.location} (${typeText})</span>
        </div>
        <div class="conference-info-item">
          <span class="info-icon">🏢</span>
          <span>${escapeHtml(conf.organizer)}</span>
        </div>
      </div>
      
      <p class="conference-description">${escapeHtml(conf.description)}</p>
      
      <div class="conference-actions">
        <button class="btn btn-primary" onclick="downloadCalendar('${conf.id}')">
          📅 添加到日历
        </button>
        <a href="${escapeHtml(conf.website)}" target="_blank" class="btn btn-secondary">
          🔗 官网
        </a>
      </div>
    </div>
  `;
}

function formatConferenceDate(date) {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

async function downloadCalendar(conferenceId) {
  try {
    const response = await fetch(`/api/conferences/${conferenceId}/calendar`);
    const blob = await response.blob();
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conferenceId}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showNotification('✅ 日历文件已下载', 'success');
  } catch (err) {
    showNotification('❌ 下载失败', 'error');
  }
}

// ========================================
// 加载统计信息
// ========================================

async function loadStats() {
  try {
    const response = await fetch('/api/articles?limit=1000');
    const data = await response.json();
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    let todayCount = 0;
    let yesterdayCount = 0;
    let weekCount = 0;
    let olderCount = 0;
    
    data.articles.forEach(article => {
      const pubDate = new Date(article.pubDate);
      if (pubDate >= today) {
        todayCount++;
      } else if (pubDate >= yesterday) {
        yesterdayCount++;
      } else if (pubDate >= weekAgo) {
        weekCount++;
      } else {
        olderCount++;
      }
    });
    
    document.getElementById('totalArticles').textContent = data.pagination.total || 0;
    document.getElementById('todayCount').textContent = todayCount;
    document.getElementById('yesterdayCount').textContent = yesterdayCount;
    document.getElementById('weekCount').textContent = weekCount;
    document.getElementById('olderCount').textContent = olderCount;
  } catch (err) {
    console.error('加载统计失败:', err);
  }
}

// ========================================
// 事件处理
// ========================================

function handleSearch() {
  const search = searchInput.value.trim();
  if (search !== currentSearch) {
    currentSearch = search;
    currentPage = 1;
    loadContent(currentTab);
  }
}

async function handleRefresh() {
  refreshBtn.disabled = true;
  refreshBtn.textContent = '刷新中...';
  
  try {
    const response = await fetch('/api/fetch', { method: 'POST' });
    const data = await response.json();
    
    if (data.success) {
      showNotification('✅ 数据已刷新', 'success');
      loadContent(currentTab);
      loadStats();
    } else {
      showNotification('❌ 刷新失败', 'error');
    }
  } catch (err) {
    showNotification('❌ 网络错误', 'error');
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = '🔄 刷新';
  }
}

// ========================================
// 分页
// ========================================

function displayPagination(paginationData, targetElement) {
  const { page, totalPages } = paginationData;
  
  if (totalPages <= 1) {
    targetElement.innerHTML = '';
    return;
  }

  let html = '';
  
  html += `
    <button class="page-btn" ${page === 1 ? 'disabled' : ''} onclick="changePage(${page - 1})">
      ← 上一页
    </button>
  `;
  
  const maxVisible = 5;
  let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }
  
  if (startPage > 1) {
    html += `<button class="page-btn" onclick="changePage(1)">1</button>`;
    if (startPage > 2) {
      html += `<span class="page-info">...</span>`;
    }
  }
  
  for (let i = startPage; i <= endPage; i++) {
    html += `
      <button class="page-btn ${i === page ? 'active' : ''}" onclick="changePage(${i})">
        ${i}
      </button>
    `;
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `<span class="page-info">...</span>`;
    }
    html += `<button class="page-btn" onclick="changePage(${totalPages})">${totalPages}</button>`;
  }
  
  html += `
    <button class="page-btn" ${page === totalPages ? 'disabled' : ''} onclick="changePage(${page + 1})">
      下一页 →
    </button>
  `;
  
  targetElement.innerHTML = html;
}

function changePage(page) {
  currentPage = page;
  loadContent(currentTab);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========================================
// 工具函数
// ========================================

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 60) {
    return `${minutes}分钟前`;
  } else if (hours < 24) {
    return `${hours}小时前`;
  } else if (days < 7) {
    return `${days}天前`;
  } else {
    return date.toLocaleDateString('zh-CN');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function openArticle(url) {
  window.open(url, '_blank');
}

function showLoading() {
  loading.style.display = 'block';
}

function hideLoading() {
  loading.style.display = 'none';
}

function showError(message) {
  error.textContent = message;
  error.style.display = 'block';
}

function hideError() {
  error.style.display = 'none';
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    background: ${type === 'success' ? '#10b981' : '#ef4444'};
    color: white;
    border-radius: 0.5rem;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    z-index: 1000;
  `;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}
