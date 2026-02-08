// ========================================
// 全局状态
// ========================================

let currentPage = 1;
let currentSearch = '';
const ARTICLES_PER_PAGE = 100; // 每页100条
let allArticles = [];

// ========================================
// DOM 元素
// ========================================

const articlesGrid = document.getElementById('articlesGrid');
const pagination = document.getElementById('pagination');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const refreshBtn = document.getElementById('refreshBtn');

// ========================================
// 初始化
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  loadArticles();
  loadStats();
  setupEventListeners();
});

function setupEventListeners() {
  searchBtn.addEventListener('click', handleSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });
  refreshBtn.addEventListener('click', handleRefresh);
}

// ========================================
// 事件处理
// ========================================

function handleSearch() {
  const search = searchInput.value.trim();
  if (search !== currentSearch) {
    currentSearch = search;
    currentPage = 1;
    loadArticles();
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
      loadArticles();
      loadStats();
    } else {
      showNotification('❌ 刷新失败', 'error');
    }
  } catch (err) {
    showNotification('❌ 网络错误', 'error');
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = '刷新';
  }
}

// ========================================
// 加载文章列表
// ========================================

async function loadArticles() {
  showLoading();
  hideError();

  try {
    // 加载所有文章用于分组显示
    const params = new URLSearchParams({
      page: 1,
      limit: 1000, // 加载足够多的文章
      search: currentSearch
    });

    const response = await fetch(`/api/articles?${params}`);
    
    if (!response.ok) {
      throw new Error('加载失败');
    }

    const data = await response.json();
    allArticles = data.articles;
    
    displayArticlesGrouped(allArticles);
  } catch (err) {
    showError('加载文章失败，请稍后重试');
    console.error('加载错误:', err);
  } finally {
    hideLoading();
  }
}

// ========================================
// 显示文章列表（按日期分组+分页）
// ========================================

function displayArticlesGrouped(articles) {
  if (articles.length === 0) {
    articlesGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
        <p style="font-size: 1.125rem; color: var(--text-secondary);">
          ${currentSearch ? '😔 没有找到匹配的文章' : '📭 暂无文章'}
        </p>
      </div>
    `;
    pagination.innerHTML = '';
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
    today: { title: '📅 今天', articles: [] },
    yesterday: { title: '📅 昨天', articles: [] },
    week: { title: '📅 本周', articles: [] },
    older: { title: '📅 更早', articles: [] }
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
  
  // 生成HTML - 按组显示
  let html = '';
  let articleCount = 0;
  
  ['today', 'yesterday', 'week', 'older'].forEach(groupKey => {
    const group = groups[groupKey];
    if (group.articles.length > 0) {
      // 计算这个组在当前页应该显示多少文章
      const groupStart = Math.max(0, start - articleCount);
      const groupEnd = Math.max(0, end - articleCount);
      
      if (groupStart < group.articles.length) {
        // 添加分组标题
        html += `
          <div style="grid-column: 1/-1;">
            <h2 class="section-title">${group.title}</h2>
          </div>
        `;
        
        // 添加该组的文章
        const groupArticles = group.articles.slice(groupStart, groupEnd);
        groupArticles.forEach(article => {
          html += generateArticleCard(article);
        });
      }
      
      articleCount += group.articles.length;
    }
  });

  articlesGrid.innerHTML = html;
  
  // 显示分页
  displayPagination({
    page: currentPage,
    limit: ARTICLES_PER_PAGE,
    total: articles.length,
    totalPages: Math.ceil(articles.length / ARTICLES_PER_PAGE)
  });
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
// 分页显示
// ========================================

function displayPagination(paginationData) {
  const { page, totalPages } = paginationData;
  
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }

  let html = '';
  
  // 上一页
  html += `
    <button class="page-btn" ${page === 1 ? 'disabled' : ''} onclick="changePage(${page - 1})">
      ← 上一页
    </button>
  `;
  
  // 页码
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
  
  // 下一页
  html += `
    <button class="page-btn" ${page === totalPages ? 'disabled' : ''} onclick="changePage(${page + 1})">
      下一页 →
    </button>
  `;
  
  pagination.innerHTML = html;
}

function changePage(page) {
  currentPage = page;
  displayArticlesGrouped(allArticles);
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
  articlesGrid.style.display = 'none';
}

function hideLoading() {
  loading.style.display = 'none';
  articlesGrid.style.display = 'grid';
}

function showError(message) {
  error.textContent = message;
  error.style.display = 'block';
}

function hideError() {
  error.style.display = 'none';
}

function showNotification(message, type = 'info') {
  // 简单的通知实现
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
