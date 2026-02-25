// ========================================
// 全局状态
// ========================================

let currentTab = 'ai_news'; // 当前激活的Tab
let currentPage = 1;
let currentSearch = '';
const ARTICLES_PER_PAGE = 100;
let allArticles = [];
let allConferences = [];
let ws = null; // WebSocket连接
let reconnectTimer = null; // 重连定时器

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

// 新文章提醒相关元素
let newArticlesNotification, refreshNewBtn, closeNotificationBtn;

// ========================================
// 初始化
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  // 初始化新文章提醒元素
  newArticlesNotification = document.getElementById('newArticlesNotification');
  refreshNewBtn = document.getElementById('refreshNewBtn');
  closeNotificationBtn = document.getElementById('closeNotification');
  
  loadStats();
  loadContent(currentTab);
  setupEventListeners();
  connectWebSocket(); // 连接WebSocket实时推送
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
  
  // 新文章提醒按钮（如果元素存在）
  if (refreshNewBtn) {
    refreshNewBtn.addEventListener('click', handleRefreshNew);
  }
  if (closeNotificationBtn) {
    closeNotificationBtn.addEventListener('click', hideNewArticlesNotification);
  }
}

// ========================================
// WebSocket 实时推送
// ========================================

function connectWebSocket() {
  // 获取WebSocket URL
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  
  console.log('🔌 正在连接WebSocket:', wsUrl);
  
  try {
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('✅ WebSocket连接成功');
      
      // 清除重连定时器
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('解析WebSocket消息失败:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('❌ WebSocket错误:', error);
    };
    
    ws.onclose = () => {
      console.log('🔌 WebSocket连接断开，5秒后重连...');
      
      // 5秒后自动重连
      reconnectTimer = setTimeout(() => {
        connectWebSocket();
      }, 5000);
    };
  } catch (error) {
    console.error('创建WebSocket连接失败:', error);
    
    // 5秒后重试
    reconnectTimer = setTimeout(() => {
      connectWebSocket();
    }, 5000);
  }
}

function handleWebSocketMessage(data) {
  console.log('📨 收到WebSocket消息:', data);
  
  switch (data.type) {
    case 'connected':
      console.log('🎉', data.message);
      break;
      
    case 'new_articles':
      handleNewArticlesNotification(data);
      break;
      
    default:
      console.log('未知消息类型:', data.type);
  }
}

function handleNewArticlesNotification(data) {
  const { category, count, articles } = data;
  
  console.log(`🔔 收到新文章推送: ${count}篇 [分类: ${category}]`);
  
  // 只在当前Tab有新文章时显示提醒
  if (category === currentTab && count > 0) {
    showNewArticlesNotification(count);
    console.log(`✨ 显示提醒: ${count}篇新文章`);
  } else {
    console.log(`⏭️ 跳过提醒: 当前Tab(${currentTab}) != 文章分类(${category})`);
  }
}

function showNewArticlesNotification(count = 1) {
  if (!newArticlesNotification) return;
  
  const countText = count > 1 ? `${count}篇` : '1篇';
  const countElement = document.getElementById('newArticlesCount');
  if (countElement) {
    countElement.textContent = countText;
  }
  
  newArticlesNotification.style.display = 'flex';
  
  // 添加滑入动画
  setTimeout(() => {
    newArticlesNotification.style.opacity = '1';
    newArticlesNotification.style.transform = 'translateY(0)';
  }, 10);
}

function hideNewArticlesNotification() {
  if (!newArticlesNotification) return;
  
  newArticlesNotification.style.opacity = '0';
  newArticlesNotification.style.transform = 'translateY(-20px)';
  
  setTimeout(() => {
    newArticlesNotification.style.display = 'none';
  }, 300);
}

async function handleRefreshNew() {
  hideNewArticlesNotification();
  await handleRefresh();
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
  } else if (tab === 'vendors') {
    document.getElementById('vendors-panel').classList.add('active');
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
  } else if (tab === 'vendors') {
    renderVendors();
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
    <article class="article-card" onclick="window.open('/summary.html?id=${article.id}', '_blank')">
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

// ========================================
// AI 大模型厂商数据 & 渲染
// ========================================

const VENDORS_DATA = [
  // ── 美国 ──
  { rank:1,  name:'OpenAI',            model:'GPT-5 · o3',                    region:'us', logo:'https://upload.wikimedia.org/wikipedia/commons/4/4d/OpenAI_Logo.svg', emoji:'🤖',
    desc:'全球最具影响力的AI研究公司，ChatGPT拥有超4亿周活跃用户。GPT系列持续领跑全球基准，在代码、推理、多模态领域树立行业标准。',
    tags:['通用LLM','多模态','推理'], url:'https://openai.com' },
  { rank:2,  name:'Google DeepMind',   model:'Gemini 3 Pro · Deep Think',     region:'us', logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/120px-Google_%22G%22_logo.svg.png', emoji:'🔵',
    desc:'谷歌顶级AI研究机构，Gemini 3 Pro以73分智能指数2025年末登顶全球榜首。AlphaFold等科学AI工具革命性改变生命科学研究格局。',
    tags:['通用LLM','科学AI','多模态'], url:'https://deepmind.google' },
  { rank:3,  name:'Anthropic',         model:'Claude Opus 4.6',               region:'us', logo:'', emoji:'🧡',
    desc:'前OpenAI核心成员创立，专注AI安全。Claude Opus 4.6于2026年2月登顶LMSYS竞技场，具备自适应思维，是公认最强编程助手，金融分析与长文本处理卓越。',
    tags:['AI安全','编程','长上下文'], url:'https://anthropic.com' },
  { rank:4,  name:'Meta AI',           model:'Llama 4 · Llama 3.3',           region:'us', logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Meta_Platforms_Inc._logo.svg/200px-Meta_Platforms_Inc._logo.svg.png', emoji:'👤',
    desc:'扎克伯格力主开源战略，Llama系列赋能全球数百万开发者。Llama 3支持128K上下文，是全球下载量最大的开源大模型系列，推动AI民主化进程。',
    tags:['开源','通用LLM','社区生态'], url:'https://ai.meta.com' },
  { rank:5,  name:'Microsoft',         model:'Copilot · Azure OpenAI · Phi',  region:'us', logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/200px-Microsoft_logo.svg.png', emoji:'🪟',
    desc:'OpenAI最大投资方，将AI深度整合进Office、Teams、Azure全线产品。Phi系列小型语言模型引领边缘AI趋势，Azure OpenAI是全球最大企业级AI部署平台。',
    tags:['企业AI','云平台','小模型'], url:'https://microsoft.com/ai' },
  { rank:6,  name:'xAI',               model:'Grok 3 · Grok 2',               region:'us', logo:'', emoji:'✕',
    desc:'马斯克创立，与X平台深度整合，拥有独特实时互联网数据优势。Grok 3以反审查、幽默风格著称，在科学推理和数学竞赛方面表现突出，订阅用户增长迅猛。',
    tags:['实时数据','推理','科学'], url:'https://x.ai' },
  { rank:7,  name:'Amazon AWS',        model:'Nova Pro · Titan · Bedrock',    region:'us', logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Amazon_Web_Services_Logo.svg/200px-Amazon_Web_Services_Logo.svg.png', emoji:'☁️',
    desc:'全球最大云服务商，Bedrock平台汇聚数十款顶级大模型。Amazon Nova兼顾性能与成本，AGI研究投入超40亿美元，是Anthropic的战略合作伙伴。',
    tags:['云平台','企业AI','多模型'], url:'https://aws.amazon.com/bedrock' },
  { rank:8,  name:'NVIDIA',            model:'Nemotron · NeMo',               region:'us', logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Nvidia_logo.svg/200px-Nvidia_logo.svg.png', emoji:'💚',
    desc:'AI算力霸主，H100/B200 GPU是全球AI训练核心基础设施。Nemotron企业级模型与NeMo平台提供端到端解决方案，市值超越全球绝大多数科技公司。',
    tags:['AI芯片','企业LLM','算力平台'], url:'https://nvidia.com/ai' },
  { rank:9,  name:'Hugging Face',      model:'SmolLM · Zephyr · HF Hub',     region:'us', logo:'', emoji:'🤗',
    desc:'全球最大开源AI模型社区，托管超100万个模型和数据集，是AI开发者的"GitHub"。Transformers库被数千万开发者使用，推动AI民主化不可或缺的基础设施。',
    tags:['开源社区','模型库','工具链'], url:'https://huggingface.co' },
  { rank:10, name:'Cohere',            model:'Command R+ · Embed · Rerank',   region:'us', logo:'', emoji:'🔷',
    desc:'专注企业级NLP，Command R+在RAG检索增强生成领域全球领先。与Oracle、SAP深度合作，在金融、法律、医疗等垂直行业建立强大壁垒。',
    tags:['企业NLP','RAG','搜索增强'], url:'https://cohere.com' },
  { rank:11, name:'AI21 Labs',         model:'Jamba 1.6 · Jurassic-2',       region:'us', logo:'', emoji:'🟡',
    desc:'以色列裔AI公司，开创性将Mamba状态空间模型与Transformer混合，Jamba系列在长文档处理效率上领先同类模型，专注企业内容创作和文档智能化。',
    tags:['混合架构','企业写作','长文本'], url:'https://ai21.com' },
  { rank:12, name:'Stability AI',      model:'Stable Diffusion 3.5 · SDXL',  region:'us', logo:'', emoji:'🎨',
    desc:'图像生成AI领域的开源先驱，Stable Diffusion系列被全球数千万创作者使用。SDXL和SD3.5在图像质量和创意表达方面持续突破，构建了最大的AI图像生成开源生态。',
    tags:['图像生成','开源','创意AI'], url:'https://stability.ai' },
  { rank:13, name:'Together AI',       model:'各类开源模型 API',               region:'us', logo:'', emoji:'⚡',
    desc:'专注开源模型云端推理，提供Llama、Mistral等数十款模型高性能API。FlashAttention等核心算法贡献者，推理速度行业领先，是开发者部署开源模型的首选平台。',
    tags:['模型推理','云API','开源生态'], url:'https://together.ai' },
  { rank:14, name:'Perplexity AI',     model:'Sonar Pro · Sonar Reasoning',   region:'us', logo:'', emoji:'🔍',
    desc:'重新定义AI搜索体验，月活超1亿，被誉为"Google挑战者"。实时网络搜索与大模型推理深度融合，提供带引用来源的精准答案，在学术研究领域深受欢迎。',
    tags:['AI搜索','实时信息','引用溯源'], url:'https://perplexity.ai' },
  { rank:15, name:'IBM Watson',        model:'Granite 3.3 · watsonx',         region:'us', logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/IBM_logo.svg/200px-IBM_logo.svg.png', emoji:'🔵',
    desc:'企业级AI老牌劲旅，watsonx平台服务全球500强企业。Granite系列开源模型在代码生成和企业数据处理卓越，在金融、医疗、政务高要求行业拥有深厚信任积累。',
    tags:['企业AI','金融医疗','合规安全'], url:'https://ibm.com/watson' },
  { rank:16, name:'Runway',            model:'Gen-3 Alpha · Gen-4',           region:'us', logo:'', emoji:'🎬',
    desc:'影视级AI视频生成标杆，Gen系列被好莱坞制作公司广泛采用。在AI视频一致性、运动流畅性方面持续领先，是创意工作者和影视从业者的核心创作工具。',
    tags:['视频生成','影视创作','多模态'], url:'https://runwayml.com' },
  { rank:17, name:'Midjourney',        model:'V7 · Niji 7',                   region:'us', logo:'', emoji:'🖼️',
    desc:'艺术图像生成领域最受欢迎工具之一，以极高艺术美感和风格一致性著称。V7版本在真实感和创意表达方面达到新高度，a16z全球AI应用榜单长期前15名。',
    tags:['图像生成','艺术创作','设计工具'], url:'https://midjourney.com' },
  { rank:18, name:'Scale AI',          model:'Donovan · RLHF平台',            region:'us', logo:'', emoji:'📊',
    desc:'AI训练数据领域独角兽，为OpenAI、Meta、Google等提供高质量数据标注服务。Donovan是专为美国国防部署的AI平台，估值超140亿美元的数据基础设施巨头。',
    tags:['数据标注','RLHF','政府AI'], url:'https://scale.com' },
  { rank:19, name:'Adept AI',          model:'ACT-2 · Fuyu',                  region:'us', logo:'', emoji:'🤝',
    desc:'专注AI Agent和自动化操作，ACT模型能像人类一样操作软件界面。Fuyu是专为UI理解优化的多模态模型，在"AI操作电脑"细分赛道全球最前沿。',
    tags:['AI Agent','UI操作','工作流自动化'], url:'https://adept.ai' },
  { rank:20, name:'Salesforce Einstein', model:'xGen · Einstein GPT',        region:'us', logo:'', emoji:'☁️',
    desc:'全球最大CRM软件商，AI深度嵌入销售、客服、营销全流程。xGen系列专为商业场景优化，Einstein Copilot让数百万企业用户无需编程即可调用AI能力。',
    tags:['CRM AI','销售助理','企业SaaS'], url:'https://salesforce.com/einstein' },
  { rank:21, name:'Allen AI (AI2)',    model:'OLMo 2 · Tulu 3',               region:'us', logo:'', emoji:'🦦',
    desc:'保罗·艾伦创立的非营利AI研究机构，专注开放透明的AI研究。OLMo 2是全球首个完全开放权重、训练数据和代码的前沿语言模型，引领学术AI开放运动。',
    tags:['学术研究','完全开源','科学AI'], url:'https://allenai.org' },

  // ── 中国 ──
  { rank:22, name:'DeepSeek 深度求索', model:'DeepSeek V3.2 · R1',            region:'cn', logo:'', emoji:'🐋',
    desc:'幻方量化旗下，2025年初以$0.27/百万token的极致性价比震撼全球，R1推理模型开源发布引发全球AI价格战，20天突破千万用户，改变整个AI产业格局。',
    tags:['性价比第一','推理模型','开源'], url:'https://deepseek.com' },
  { rank:23, name:'阿里通义千问',      model:'Qwen3-Max · Qwen2.5',           region:'cn', logo:'', emoji:'☁️',
    desc:'阿里通义团队研发，拥有超过1T参数的Qwen3-Max在代码和Agent能力上达到业界顶尖水平。在电商、供应链场景表现卓越，开源版本在全球开发者社区广受欢迎。',
    tags:['大参数量','Agent','多语言'], url:'https://qianwen.aliyun.com' },
  { rank:24, name:'字节豆包',          model:'Doubao-Seed-2.0 · Lite',       region:'cn', logo:'', emoji:'🫘',
    desc:'字节跳动旗下AI助手，国内月活用户稳居第一梯队。Seed2.0在视觉推理和Agent能力评估达业界第一梯队，a16z全球AI应用榜单排名第十，短视频内容理解领域独树一帜。',
    tags:['通用助手','视觉推理','高并发'], url:'https://www.doubao.com' },
  { rank:25, name:'百度文心一言',      model:'ERNIE 5.0 · 4.0 Turbo',        region:'cn', logo:'', emoji:'🔴',
    desc:'国内最早商业化大模型，日均调用量超5亿次。ERNIE 5.0在金融领域推理准确率达98%，与萝卜快跑自动驾驶深度融合，形成独特的产业AI生态。',
    tags:['搜索增强','知识问答','产业AI'], url:'https://yiyan.baidu.com' },
  { rank:26, name:'月之暗面 Kimi',     model:'Kimi K2 Thinking · Kimi VL',   region:'cn', logo:'', emoji:'🌙',
    desc:'前DeepMind华人科学家创立，以超长上下文处理著称（200万token）。Kimi K2 Thinking全球模型排名第五，a16z全球AI应用榜单排名第11，多模态和推理能力持续突破。',
    tags:['超长上下文','推理模型','多模态'], url:'https://kimi.moonshot.cn' },
  { rank:27, name:'智谱AI',            model:'GLM-5 · GLM-4V · AutoGLM',     region:'cn', logo:'', emoji:'🟣',
    desc:'清华大学KEG团队孵化，GLM-5在LMSYS竞技场荣获国产模型第一。CogVideo视频生成国内前列，AutoGLM实现手机App自动化操作，是国内AI Agent领域领军者。',
    tags:['清华系','AI Agent','视频生成'], url:'https://www.zhipuai.cn' },
  { rank:28, name:'腾讯混元',          model:'混元大模型 3.0 · Hunyuan-DiT', region:'cn', logo:'', emoji:'🐧',
    desc:'腾讯自研大模型，深度整合微信、QQ、企业微信等11亿用户生态。混元3.0开源版代码能力接近GPT-4o，在企业级安全性方面独特优势，内容创作场景表现突出。',
    tags:['超级生态','内容创作','企业安全'], url:'https://hunyuan.tencent.com' },
  { rank:29, name:'MiniMax',           model:'MiniMax-01 · 海螺AI',           region:'cn', logo:'', emoji:'✨',
    desc:'独创线性注意力机制，MiniMax-01支持高达400万token超长文本，工业与医疗场景效率提升50%。海螺AI视频2025年1月全球访问量第一，a16z榜单排名第12。',
    tags:['超长上下文','视频生成','线性注意力'], url:'https://www.minimax.io' },
  { rank:30, name:'百川智能',          model:'Baichuan 4 · Turbo',            region:'cn', logo:'', emoji:'🌊',
    desc:'搜狗创始人王小川创立，专注医疗健康AI赛道。Baichuan 4在中文医疗问答领域表现领先，拥有完整医学知识图谱和海量医疗数据，获医疗机构和险企广泛采用。',
    tags:['医疗AI','中文优化','垂直领域'], url:'https://platform.baichuan-ai.com' },
  { rank:31, name:'科大讯飞星火',      model:'星火 4.0 Turbo · Max',          region:'cn', logo:'', emoji:'⭐',
    desc:'语音AI技术全球领先，星火大模型融合语音识别30年技术积累。在教育场景率先落地AI黑板、学情分析等产品，在政务、医疗、金融等垂直领域有广泛应用案例。',
    tags:['语音AI','教育场景','政务AI'], url:'https://www.iflytek.com/xinghuo' },
  { rank:32, name:'商汤科技',          model:'日日新 5.5 · 大医',             region:'cn', logo:'', emoji:'👁️',
    desc:'全球最大AI视觉公司之一，日日新大模型涵盖通用、医疗、教育多垂直领域。与瑞金医院合作开发病理大模型"大医"，自建国内最大AI算力基础设施，港股上市。',
    tags:['计算机视觉','医疗AI','算力基础设施'], url:'https://www.sensetime.com' },
  { rank:33, name:'华为盘古',          model:'盘古大模型 5.0 · 气象大模型',  region:'cn', logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Huawei_Standard_logo.svg/200px-Huawei_Standard_logo.svg.png', emoji:'🌸',
    desc:'华为自研大模型，在气象预测、工业质检和政务等专业领域表现卓越。盘古气象大模型精度超越传统数值方法，秒级生成7天天气预报，是全球工业AI的重要标杆。',
    tags:['工业AI','气象预测','全栈自主'], url:'https://www.huawei.com/cn/industry-insights/technology/ai/pangu' },
  { rank:34, name:'零一万物',          model:'Yi-Lightning · Yi-VL',          region:'cn', logo:'', emoji:'⚪',
    desc:'前谷歌中国总裁李开复创立，Yi系列模型以超高性价比著称，Yi-34B-Chat在开源模型中长期占据性能榜首。专注构建AGI时代的"AI 2.0"工具和应用平台，融资超10亿美元。',
    tags:['开源领军','多语言','AGI导向'], url:'https://www.01.ai' },
  { rank:35, name:'阶跃星辰',          model:'Step-2 · Step-1V',              region:'cn', logo:'', emoji:'🐉',
    desc:'前微软亚洲研究院院长姜大昕创立，专注突破AGI核心技术。Step-2在数学推理和代码生成方面达到国内顶尖水平，获多轮高额融资，被视为最具AGI潜力的中国创业公司之一。',
    tags:['AGI研究','数学推理','代码生成'], url:'https://www.stepfun.com' },
  { rank:36, name:'面壁智能',          model:'MiniCPM 3.0 · CPM-Bee',        region:'cn', logo:'', emoji:'🧱',
    desc:'清华大学NLP实验室孵化，专注高效端侧小模型。MiniCPM-3.0以2B参数实现接近GPT-3.5级别性能，在手机、平板等边缘设备运行流畅，引领端侧AI部署新范式。',
    tags:['端侧AI','小参数高性能','移动端'], url:'https://minicpm.com' },
  { rank:37, name:'快手可灵',          model:'Kling AI · 可灵 2.0',          region:'cn', logo:'', emoji:'⚡',
    desc:'快手自研AI视频生成大模型，2025年a16z全球AI应用榜单排名第17，超越Runway和Sora。可灵2.0在运动一致性和长视频生成方面领先国内同类，已有超700万创作者使用。',
    tags:['视频生成','创作工具','短视频AI'], url:'https://kling.kuaishou.com' },
  { rank:38, name:'中科院计算所',      model:'紫东太初 3.0',                  region:'cn', logo:'', emoji:'🔬',
    desc:'中国科学院计算技术研究所研发，紫东太初是全球首个支持三模态（文图音）交互的千亿参数大模型，在内容创作、智慧城市和文化传承场景率先落地，代表中国AI科研机构最高水平。',
    tags:['多模态先驱','科研级','国家队'], url:'https://www.ict.ac.cn' },
  { rank:39, name:'旷视科技',          model:'旷视大模型 · Brain++',          region:'cn', logo:'', emoji:'👤',
    desc:'计算机视觉领域独角兽，Brain++一体化AI生产力平台覆盖训练-部署全流程。在人脸识别、行为分析和工业质检方面拥有全球领先落地案例，服务超千家企业级客户。',
    tags:['计算机视觉','人脸识别','工业AI'], url:'https://www.megvii.com' },
  { rank:40, name:'第四范式',          model:'式说 4.0 · SAGE AI',            region:'cn', logo:'', emoji:'📈',
    desc:'企业级AI平台上市公司（港股06682），专注金融、零售、能源垂直行业AI落地。先知平台帮助500+大型企业将AI决策能力规模化，是国内最早实现大规模企业AI商业化的公司之一。',
    tags:['决策AI','金融场景','企业平台'], url:'https://www.4paradigm.com' },
  { rank:41, name:'天工AI（昆仑万维）', model:'天工 3.0 · SkyWork',           region:'cn', logo:'', emoji:'🏔️',
    desc:'昆仑万维旗下AI平台，天工超级搜索月活超2000万。天工3.0在搜索增强生成和实时信息处理方面突出，作曲、绘画等AIGC功能深受创作者青睐，形成搜索与创作融合生态。',
    tags:['AI搜索','AIGC创作','音乐生成'], url:'https://tiangong.cn' },
  { rank:42, name:'360智脑',           model:'360智脑 5.0 · 数字人',          region:'cn', logo:'', emoji:'🔒',
    desc:'360集团安全AI布局，深度融合安全大数据和百亿级用户行为数据。在网络安全AI、数字人和企业知识管理方面形成差异化优势，拥有完整的安全大模型技术体系。',
    tags:['安全AI','数字人','知识管理'], url:'https://ai.360.cn' },
  { rank:43, name:'联想 AI',           model:'联想小天 · 端侧AI PC',          region:'cn', logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Lenovo_logo_2015.svg/200px-Lenovo_logo_2015.svg.png', emoji:'💻',
    desc:'全球最大PC厂商战略布局AI PC，将大模型推理能力直接集成到硬件设备。同时入选全球多个顶级AI企业榜单，在AI PC标准制定和端侧AI部署方面扮演重要角色。',
    tags:['AI PC','端侧推理','硬件AI'], url:'https://www.lenovo.com/ai' },
  { rank:44, name:'京东言犀',          model:'言犀 3.0 · 采销 AI',           region:'cn', logo:'', emoji:'🛒',
    desc:'京东自研产业大模型，深度整合供应链、物流、零售全链路数据。言犀在价格预测、智能客服和商品推荐方面具备独特电商数据优势，服务数亿消费者和数百万商家。',
    tags:['电商AI','供应链','智能客服'], url:'https://ling.jd.com' },

  // ── 欧洲 ──
  { rank:45, name:'Mistral AI',        model:'Mistral Large 3 · Le Chat',     region:'eu', logo:'', emoji:'🌪️',
    desc:'前DeepMind和Meta研究员创立的欧洲AI旗舰公司，估值超60亿美元。Mistral 7B开源发布引发全球轰动，Le Chat是欧洲用户量最大的AI助手，致力于欧洲AI主权。',
    tags:['欧洲领军','高效开源','多语言'], url:'https://mistral.ai' },
  { rank:46, name:'Aleph Alpha',       model:'Luminous · Pharia',             region:'eu', logo:'', emoji:'α',
    desc:'德国最重要AI初创公司，专注欧洲可解释性AI和数据主权。Pharia模型为欧洲政府和企业提供符合GDPR的AI解决方案，获德国联邦政府支持，是欧洲AI自主权核心力量。',
    tags:['可解释AI','数据主权','政府AI'], url:'https://aleph-alpha.com' },
  { rank:47, name:'Kyutai',            model:'Moshi · Helium',                region:'eu', logo:'', emoji:'🔊',
    desc:'法国非营利AI研究机构，由Iliad集团创始人赞助。Moshi是全球首个实时端到端语音对话模型，延迟低至160ms，完全开源。Helium是专为移动端优化的双语小型语言模型。',
    tags:['实时语音AI','完全开源','法国AI'], url:'https://kyutai.org' },
  { rank:48, name:'Inflection AI',     model:'Pi · Inflection 3',             region:'eu', logo:'', emoji:'💬',
    desc:'DeepMind联合创始人Mustafa Suleyman创立，专注个人AI伴侣Pi。Inflection-3在情感智能和个性化对话方面独树一帜，以极高用户留存率著称，探索AI与人类关系新范式。',
    tags:['个人AI伴侣','情感智能','对话AI'], url:'https://inflection.ai' },

  // ── 其他 ──
  { rank:49, name:'NAVER HyperCLOVA', model:'HyperCLOVA X · CLOVA',          region:'other', logo:'', emoji:'🇰🇷',
    desc:'韩国最大互联网公司NAVER旗下，HyperCLOVA X是亚洲最大韩语语言模型，参数量超820亿。在韩语理解、韩国文化知识和商业智能方面达全球领先水平，是韩国AI主权核心支柱。',
    tags:['韩语AI','亚洲领军','搜索AI'], url:'https://www.naver.com' },
  { rank:50, name:'TII (阿联酋技术创新院)', model:'Falcon 180B · Falcon 3',   region:'other', logo:'', emoji:'🦅',
    desc:'阿联酋政府设立的AI研究机构，Falcon系列开源模型在发布时多次登顶Hugging Face开源模型排行榜。代表中东地区最强的AI研发实力，致力于推动阿联酋成为全球AI中心。',
    tags:['中东AI','开源领军','政府研究院'], url:'https://falconllm.tii.ae' },
];

let vendorsRendered = false;
let currentVendorRegion = 'all';

function renderVendors() {
  if (vendorsRendered) {
    filterVendorCards(currentVendorRegion);
    return;
  }
  vendorsRendered = true;

  const grid = document.getElementById('vendorsGrid');
  if (!grid) return;

  grid.innerHTML = VENDORS_DATA.map((v, i) => {
    const isTop3 = v.rank <= 3;
    const regionClass = 'region-' + v.region;
    const regionLabel = { us:'🇺🇸 美国', cn:'🇨🇳 中国', eu:'🇪🇺 欧洲', other:'🌏 其他' }[v.region];
    const logoHtml = v.logo
      ? `<img src="${v.logo}" alt="${v.name}" onerror="this.parentNode.innerHTML='${v.emoji}'">`
      : v.emoji;

    return `
      <a href="${v.url}" target="_blank" rel="noopener"
         class="vendor-card${isTop3 ? ' top3' : ''}"
         data-region="${v.region}"
         style="animation-delay:${Math.min(i * 0.025, 0.4)}s">
        <div class="vc-top">
          <div class="vc-logo">${logoHtml}</div>
          <div class="vc-info">
            <div class="vc-rank">NO.${String(v.rank).padStart(2,'0')}</div>
            <div class="vc-name">${v.name}</div>
            <div class="vc-model">${v.model}</div>
          </div>
          <span class="region-badge ${regionClass}">${regionLabel}</span>
        </div>
        <p class="vc-desc">${v.desc}</p>
        <div class="vc-footer">
          <div class="vc-tags">${v.tags.map(t => `<span class="vc-tag">${t}</span>`).join('')}</div>
          <span class="vc-link">访问官网 →</span>
        </div>
      </a>`;
  }).join('');

  // 筛选按钮事件
  document.querySelectorAll('.vf-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.vf-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentVendorRegion = btn.dataset.region;
      filterVendorCards(currentVendorRegion);
    });
  });
}

function filterVendorCards(region) {
  document.querySelectorAll('#vendorsGrid .vendor-card').forEach(card => {
    if (region === 'all' || card.dataset.region === region) {
      card.classList.remove('hidden');
    } else {
      card.classList.add('hidden');
    }
  });
}
