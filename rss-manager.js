const fs = require('fs');
const path = require('path');

// RSS配置文件路径
const CONFIG_FILE = path.join(__dirname, 'rss-config.json');

// 默认配置
const DEFAULT_CONFIG = {
  password: 'admin123', // 默认密码，首次使用后应该修改
  feeds: [
    {
      id: '1',
      name: 'WAIC',
      url: 'https://we-mp-rss-production-fcb0.up.railway.app/feed/MP_WXS_3201788143.rss',
      enabled: true
    },
    {
      id: '2',
      name: '机器之心',
      url: 'https://we-mp-rss-production-fcb0.up.railway.app/feed/MP_WXS_3098132220.rss',
      enabled: true
    },
    {
      id: '3',
      name: '量子位',
      url: 'https://we-mp-rss-production-fcb0.up.railway.app/feed/MP_WXS_3271041950.rss',
      enabled: true
    },
    {
      id: '4',
      name: 'AI前线',
      url: 'https://we-mp-rss-production-fcb0.up.railway.app/feed/MP_WXS_3236757533.rss',
      enabled: true
    },
    {
      id: '5',
      name: '新智元',
      url: 'https://we-mp-rss-production-fcb0.up.railway.app/feed/MP_WXS_3073282833.rss',
      enabled: true
    },
    {
      id: '6',
      name: '智能涌现',
      url: 'https://we-mp-rss-production-fcb0.up.railway.app/feed/MP_WXS_3582835969.rss',
      enabled: true
    }
  ]
};

// 读取配置
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('读取配置文件失败:', err);
  }
  return DEFAULT_CONFIG;
}

// 保存配置
function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('保存配置文件失败:', err);
    return false;
  }
}

// 获取RSS源列表（只返回启用的）
function getRSSFeeds() {
  const config = loadConfig();
  return config.feeds
    .filter(feed => feed.enabled)
    .map(feed => ({
      name: feed.name,
      url: feed.url
    }));
}

// 获取所有RSS源（包括禁用的）
function getAllRSSFeeds() {
  const config = loadConfig();
  return config.feeds;
}

// 添加RSS源
function addRSSFeed(name, url) {
  const config = loadConfig();
  const newId = String(Math.max(...config.feeds.map(f => parseInt(f.id) || 0)) + 1);
  
  config.feeds.push({
    id: newId,
    name,
    url,
    enabled: true
  });
  
  return saveConfig(config);
}

// 更新RSS源
function updateRSSFeed(id, updates) {
  const config = loadConfig();
  const index = config.feeds.findIndex(f => f.id === id);
  
  if (index === -1) return false;
  
  config.feeds[index] = {
    ...config.feeds[index],
    ...updates
  };
  
  return saveConfig(config);
}

// 删除RSS源
function deleteRSSFeed(id) {
  const config = loadConfig();
  config.feeds = config.feeds.filter(f => f.id !== id);
  return saveConfig(config);
}

// 验证密码
function verifyPassword(password) {
  const config = loadConfig();
  return config.password === password;
}

// 修改密码
function changePassword(newPassword) {
  const config = loadConfig();
  config.password = newPassword;
  return saveConfig(config);
}

module.exports = {
  getRSSFeeds,
  getAllRSSFeeds,
  addRSSFeed,
  updateRSSFeed,
  deleteRSSFeed,
  verifyPassword,
  changePassword
};
