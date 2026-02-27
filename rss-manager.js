const fs = require('fs');
const path = require('path');

// RSS配置文件路径配置（支持云服务器持久化存储）
// 优先级：环境变量 > /app/data > /data > 项目目录
const getConfigDir = () => {
  // 1. 检查环境变量
  if (process.env.CONFIG_PATH) {
    return process.env.CONFIG_PATH;
  }

  // 2. 检查云平台数据目录
  const dataDirs = ['/app/data', '/data'];
  for (const dir of dataDirs) {
    if (fs.existsSync(dir) || process.env.NODE_ENV === 'production') {
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
        } catch (e) {
          console.warn(`⚠️ 无法创建目录 ${dir}:`, e.message);
        }
      }
      return dir;
    }
  }

  // 3. 默认使用项目目录
  return __dirname;
};

const DATA_DIR = getConfigDir();
const CONFIG_FILE = path.join(DATA_DIR, 'rss-config.json');

// 确保目录存在
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`📁 创建配置目录: ${DATA_DIR}`);
  } catch (err) {
    console.error(`❌ 无法创建配置目录: ${err.message}`);
  }
}

console.log(`📍 RSS配置路径: ${CONFIG_FILE}`);

// 默认配置（包含分类）
const DEFAULT_CONFIG = {
  password: 'admin123',
  feeds: [
    {
      id: '1',
      name: 'WAIC',
      url: 'http://43.167.164.233:8080/feed/MP_WXS_3201788143.rss',
      enabled: true,
      category: 'ai_news'
    },
    {
      id: '2',
      name: '机器之心',
      url: 'http://43.167.164.233:8080/feed/MP_WXS_3098132220.rss',
      enabled: true,
      category: 'ai_news'
    },
    {
      id: '3',
      name: '量子位',
      url: 'http://43.167.164.233:8080/feed/MP_WXS_3271041950.rss',
      enabled: true,
      category: 'ai_news'
    },
    {
      id: '4',
      name: 'AI前线',
      url: 'http://43.167.164.233:8080/feed/MP_WXS_3236757533.rss',
      enabled: true,
      category: 'ai_news'
    },
    {
      id: '5',
      name: '新智元',
      url: 'http://43.167.164.233:8080/feed/MP_WXS_3073282833.rss',
      enabled: true,
      category: 'ai_news'
    },
    {
      id: '6',
      name: '世界人工智能大会',
      url: 'http://43.167.164.233:8080/feed/MP_WXS_3582835969.rss',
      enabled: true,
      category: 'ai_news'
    },
    {
      id: '7',
      name: 'AI信息Gap',
      url: 'http://43.167.164.233:8080/feed/MP_WXS_3903631794.rss',
      enabled: true,
      category: 'ai_news'
    },
    {
      id: '8',
      name: 'APPSO',
      url: 'http://43.167.164.233:8080/feed/MP_WXS_2392024520.rss',
      enabled: true,
      category: 'ai_news'
    },
    {
      id: '9',
      name: 'AI特大号',
      url: 'http://43.167.164.233:8080/feed/MP_WXS_3933528830.rss',
      enabled: true,
      category: 'ai_news'
    },
    {
      id: '10',
      name: 'AI前线',
      url: 'http://43.167.164.233:8080/feed/MP_WXS_3554086560.rss',
      enabled: true,
      category: 'ai_news'
    },
    {
      id: '11',
      name: '硅星人Pro',
      url: 'http://43.167.164.233:8080/feed/MP_WXS_3926568365.rss',
      enabled: true,
      category: 'ai_news'
    },
    {
      id: '12',
      name: '甲子光年',
      url: 'http://43.167.164.233:8080/feed/MP_WXS_3599245772.rss',
      enabled: true,
      category: 'ai_news'
    },
    {
      id: '13',
      name: '极客公园',
      url: 'http://43.167.164.233:8080/feed/MP_WXS_1304308441.rss',
      enabled: true,
      category: 'ai_news'
    },
    {
      id: '14',
      name: '数字生命卡兹克',
      url: 'http://43.167.164.233:8080/feed/MP_WXS_3223096120.rss',
      enabled: true,
      category: 'ai_news'
    },
    {
      id: '15',
      name: '夕小瑶科技说',
      url: 'http://43.167.164.233:8080/feed/MP_WXS_3207765945.rss',
      enabled: true,
      category: 'ai_news'
    },
    {
      id: '16',
      name: '智能涌现',
      url: 'http://43.167.164.233:8080/feed/MP_WXS_3900464567.rss',
      enabled: true,
      category: 'ai_news'
    },
    {
      id: '17',
      name: '张张讲AI',
      url: 'http://43.167.164.233:8080/feed/MP_WXS_3233554320.rss',
      enabled: true,
      category: 'ai_news'
    },
    {
      id: '18',
      name: '智东西',
      url: 'http://43.167.164.233:8080/feed/MP_WXS_3081486433.rss',
      enabled: true,
      category: 'ai_news'
    },
    // 5家AI巨头公司的官方RSS源
    {
      id: '19',
      name: 'OpenAI',
      url: 'https://openai.com/news/rss.xml',
      enabled: true,
      category: 'ai_news'
    },
    {
      id: '20',
      name: 'Google AI',
      url: 'https://research.google/blog/rss',
      enabled: true,
      category: 'ai_news'
    },
    {
      id: '21',
      name: 'Anthropic',
      url: 'https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml',
      enabled: true,
      category: 'ai_news'
    },
    {
      id: '22',
      name: 'Meta AI',
      url: 'https://research.facebook.com/feed',
      enabled: true,
      category: 'ai_news'
    },
    {
      id: '23',
      name: 'Microsoft AI',
      url: 'https://www.microsoft.com/en-us/research/blog/feed/',
      enabled: true,
      category: 'ai_news'
    },
    // 更多顶级AI公司和研究机构
    {
      id: '24',
      name: 'DeepMind',
      url: 'https://deepmind.google/blog/rss.xml',
      enabled: true,
      category: 'ai_news'
    },
    {
      id: '25',
      name: 'Hugging Face',
      url: 'https://huggingface.co/blog/feed.xml',
      enabled: true,
      category: 'ai_news'
    },
    {
      id: '26',
      name: 'NVIDIA AI',
      url: 'https://developer.nvidia.com/blog/feed',
      enabled: true,
      category: 'ai_news'
    },
    {
      id: '27',
      name: 'Stability AI',
      url: 'https://stability.ai/blog?format=rss',
      enabled: false,
      category: 'ai_news'
    },
    {
      id: '28',
      name: 'Stanford AI',
      url: 'https://ai.stanford.edu/blog/feed.xml',
      enabled: true,
      category: 'ai_news'
    },
    {
      id: '29',
      name: 'MIT AI',
      url: 'https://news.mit.edu/rss/topic/artificial-intelligence2',
      enabled: true,
      category: 'ai_news'
    },
    {
      id: '30',
      name: 'AWS AI',
      url: 'https://aws.amazon.com/blogs/machine-learning/feed/',
      enabled: true,
      category: 'ai_news'
    }
  ]
};

// 读取配置
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      const config = JSON.parse(data);
      // 确保所有feed都有category字段
      config.feeds = config.feeds.map(feed => ({
        ...feed,
        category: feed.category || 'ai_news'
      }));
      return config;
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
      url: feed.url,
      category: feed.category || 'ai_news'
    }));
}

// 获取所有RSS源（包括禁用的）
function getAllRSSFeeds() {
  const config = loadConfig();
  return config.feeds;
}

// 按分类获取RSS源
function getRSSFeedsByCategory(category) {
  const config = loadConfig();
  return config.feeds
    .filter(feed => feed.enabled && feed.category === category)
    .map(feed => ({
      name: feed.name,
      url: feed.url,
      category: feed.category
    }));
}

// 添加RSS源
function addRSSFeed(name, url, category = 'ai_news') {
  const config = loadConfig();
  const newId = String(Math.max(...config.feeds.map(f => parseInt(f.id) || 0)) + 1);
  
  config.feeds.push({
    id: newId,
    name,
    url,
    enabled: true,
    category
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
  getRSSFeedsByCategory,
  addRSSFeed,
  updateRSSFeed,
  deleteRSSFeed,
  verifyPassword,
  changePassword
};
