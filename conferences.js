// AI行业会议数据 - 2026年
const conferences = [
  {
    id: 'waic-up-2026',
    title: 'WAIC UP! Global Summit',
    organizer: '世界人工智能大会组委会',
    date: '2026-01-16',
    endDate: '2026-01-16',
    location: '中国香港',
    type: 'offline',
    description: '链接全球AI生态，发布前沿技术成果、产业政策，搭建国际合作平台',
    website: 'https://www.worldaic.com.cn/'
  },
  {
    id: 'idc-ai-summit-2026',
    title: 'IDC中国AI峰会',
    organizer: 'IDC China',
    date: '2026-01-27',
    endDate: '2026-01-27',
    location: '北京',
    type: 'hybrid',
    description: 'AI Agent架构、企业数据治理、AI投资趋势',
    website: 'https://event.idc.com/china/ai-summit-2026'
  },
  {
    id: 'icaids-2026',
    title: 'ICAIDS 2026',
    organizer: '克莱姆森大学等',
    date: '2026-01-30',
    endDate: '2026-02-01',
    location: '三亚',
    type: 'hybrid',
    description: '数字媒体、社会计算、大语言模型、知识图谱',
    website: 'https://ais.cn/u/3eiUVb'
  },
  {
    id: 'caic-2026',
    title: 'CAIC 2026',
    organizer: '武汉纺织大学',
    date: '2026-02-06',
    endDate: '2026-02-08',
    location: '三亚',
    type: 'offline',
    description: '生成式AI、量子计算与AI、智能控制、机器人系统',
    website: 'http://www.iccaic.net'
  },
  {
    id: 'icads-2026',
    title: 'ICADS 2026',
    organizer: '广州大学',
    date: '2026-02-06',
    endDate: '2026-02-08',
    location: '昆明',
    type: 'online',
    description: '深度学习方法、强化学习、智能推荐系统、数字服务',
    website: 'http://www.ic-icads.org'
  },
  {
    id: 'aici-2026',
    title: 'AICI 2026',
    organizer: '郑州大学',
    date: '2026-02-06',
    endDate: '2026-02-08',
    location: '郑州',
    type: 'offline',
    description: '进化计算、神经网络、机器学习、深度学习',
    website: 'http://www.icaici.org'
  },
  {
    id: 'iccvaa-2026',
    title: 'ICCVAA 2026',
    organizer: 'SPIE',
    date: '2026-03-06',
    endDate: '2026-03-08',
    location: '郑州',
    type: 'offline',
    description: '计算机视觉、AI算法、智能自动化',
    website: 'https://www.iccvaa.com/'
  },
  {
    id: 'china-agi-2026',
    title: '中国通用人工智能大会',
    organizer: '中国电工技术学会等',
    date: '2026-03-11',
    endDate: '2026-03-13',
    location: '杭州',
    type: 'offline',
    description: 'AGI技术全景，大模型、多模态、具身智能，3000+人参会',
    website: 'https://m.huodongjia.com/event-1541062199.html'
  },
  {
    id: 'ai-robot-2026',
    title: '人工智能与机器人创新产业大会',
    organizer: '北京人工智能学会等',
    date: '2026-03-18',
    endDate: '2026-03-18',
    location: '北京',
    type: 'offline',
    description: 'AI与机器人技术最新进展、应用场景和未来趋势',
    website: 'https://mp.ofweek.com/exhibition/a656714380687'
  },
  {
    id: 'aigc-multimodal-2026',
    title: 'AIGC与多模态智能峰会',
    organizer: '机器之心',
    date: '2026-03-20',
    endDate: '2026-03-21',
    location: '北京',
    type: 'hybrid',
    description: '生成式AI、文生图/视频、语音合成、多模态大模型',
    website: 'https://www.jiqizhixin.com/events/aigc-2026'
  },
  {
    id: 'aieta-2026',
    title: 'AIETA 2026',
    organizer: '兰州博文科技学院',
    date: '2026-03-27',
    endDate: '2026-03-29',
    location: '兰州',
    type: 'offline',
    description: 'AI在教育中的应用、教育技术、智能学习环境',
    website: 'http://www.aieta.org'
  },
  {
    id: 'cdie-2026',
    title: 'CDIE数字化创新博览会',
    organizer: '主办方未明',
    date: '2026-04-14',
    endDate: '2026-04-15',
    location: '上海',
    type: 'offline',
    description: '数字化转型、AI应用、人形机器人，六大行业论坛',
    website: 'https://www.cdie.cn/signin/19/2026-CDIE-SH'
  },
  {
    id: 'qcon-beijing-2026',
    title: 'QCon全球软件开发大会（北京）',
    organizer: 'InfoQ中国',
    date: '2026-04-16',
    endDate: '2026-04-18',
    location: '北京',
    type: 'offline',
    description: '面向技术团队负责人、架构师，分享技术创新和实践',
    website: 'https://qcon.infoq.cn/2026/beijing'
  },
  {
    id: 'aitc-2026',
    title: 'AITC 2026',
    organizer: '四川师范大学、IEEE',
    date: '2026-04-18',
    endDate: '2026-04-20',
    location: '成都',
    type: 'hybrid',
    description: '机器学习、计算机视觉、NLP、智能机器人',
    website: 'http://aitc.org/index.html'
  },
  {
    id: 'isai-2026',
    title: 'ISAI 2026',
    organizer: '四川省电子学会',
    date: '2026-04-24',
    endDate: '2026-04-26',
    location: '成都',
    type: 'offline',
    description: 'AI、大数据、云计算行业应用价值与实践',
    website: 'https://isai.org/'
  },
  {
    id: 'icaigd-2026',
    title: 'ICAIGD 2026',
    organizer: '湖北科技大学',
    date: '2026-05-15',
    endDate: '2026-05-17',
    location: '武汉',
    type: 'offline',
    description: '生成式AI算法、跨模态内容生成、智能优化设计',
    website: 'http://www.icaigd.com'
  },
  {
    id: 'aidm-2026',
    title: 'AIDM 2026',
    organizer: '成都信息工程大学',
    date: '2026-05-22',
    endDate: '2026-05-24',
    location: '成都',
    type: 'offline',
    description: '机器学习、深度学习、大数据分析、知识发现',
    website: 'http://www.ic-aidm.org'
  },
  {
    id: 'gaitc-2026',
    title: 'GAITC 2026',
    organizer: '中国人工智能学会',
    date: '2026-05-24',
    endDate: '2026-05-26',
    location: '杭州',
    type: 'offline',
    description: '中国AI领域最高规格学术+产业大会，20+专题论坛',
    website: 'http://www.gaitc.org.cn'
  },
  {
    id: 'caibda-2026',
    title: 'CAIBDA 2026',
    organizer: '中国计算机学会',
    date: '2026-06-12',
    endDate: '2026-06-14',
    location: '天津',
    type: 'hybrid',
    description: '人工智能、大数据、算法优化、量子计算',
    website: 'http://www.caibda.org'
  },
  {
    id: 'ai-devcon-2026',
    title: 'AI DevCon China',
    organizer: 'CSDN、华为云',
    date: '2026-06-14',
    endDate: '2026-06-15',
    location: '深圳',
    type: 'hybrid',
    description: 'AI框架、模型微调、Agent开发、MLOps实战',
    website: 'https://devcon.csdn.net/2026'
  },
  {
    id: 'aicon-shanghai-2026',
    title: 'AICon全球人工智能大会（上海）',
    organizer: 'InfoQ中国',
    date: '2026-06-26',
    endDate: '2026-06-27',
    location: '上海',
    type: 'offline',
    description: 'AI与大模型技术、AI Agent、研发新范式',
    website: 'https://aicon.infoq.cn/2026/shanghai'
  },
  {
    id: 'waic-2026',
    title: 'WAIC 2026世界人工智能大会',
    organizer: '国家发改委等',
    date: '2026-07-04',
    endDate: '2026-07-06',
    location: '上海',
    type: 'offline',
    description: '全球顶级AI盛会，大模型、AI芯片、自动驾驶，7万㎡展览',
    website: 'https://www.worldaic.com.cn'
  },
  {
    id: 'prai-2026',
    title: 'PRAI 2026',
    organizer: '上海交通大学、IEEE',
    date: '2026-08-14',
    endDate: '2026-08-16',
    location: '上海',
    type: 'offline',
    description: '模式识别与AI学术交流平台',
    website: 'https://prai.net/'
  },
  {
    id: 'aicon-shenzhen-2026',
    title: 'AICon全球人工智能大会（深圳）',
    organizer: 'InfoQ中国',
    date: '2026-08-21',
    endDate: '2026-08-22',
    location: '深圳',
    type: 'offline',
    description: '大模型训练与推理、AI Agent、组织变革',
    website: 'https://aicon.infoq.cn/2026/shenzhen'
  },
  {
    id: 'agic-2026',
    title: 'AGIC 2026深圳国际通用AI大会',
    organizer: '深圳市AI产业协会',
    date: '2026-08-26',
    endDate: '2026-08-28',
    location: '深圳',
    type: 'offline',
    description: '全球最大机器人及AI展会，仿生智能、具身智能',
    website: 'http://www.agicexpo.com'
  },
  {
    id: 'aipr-2026',
    title: 'AIPR 2026',
    organizer: '华侨大学',
    date: '2026-09-18',
    endDate: '2026-09-20',
    location: '厦门',
    type: 'offline',
    description: '模式识别、机器学习、计算机视觉',
    website: 'https://aipr.net/index.html'
  },
  {
    id: 'cicai-2026',
    title: 'CICAI 2026',
    organizer: '中国人工智能学会',
    date: '2026-10-17',
    endDate: '2026-10-18',
    location: '嘉兴海宁',
    type: 'offline',
    description: '脑启发AI、机器学习、产学研融合',
    website: 'https://cicai2026.caaionline.org/'
  },
  {
    id: 'qcon-shanghai-2026',
    title: 'QCon全球软件开发大会（上海）',
    organizer: 'InfoQ中国',
    date: '2026-10-22',
    endDate: '2026-10-24',
    location: '上海',
    type: 'offline',
    description: '综合性技术盛会，面向技术团队负责人',
    website: 'https://qcon.infoq.cn/2026/shanghai'
  },
  {
    id: 'aicon-beijing-2026',
    title: 'AICon全球人工智能大会（北京）',
    organizer: 'InfoQ中国',
    date: '2026-12-18',
    endDate: '2026-12-19',
    location: '北京',
    type: 'offline',
    description: 'AI技术、大模型、企业应用战略',
    website: 'https://aicon.infoq.cn/2026/beijing'
  }
];

// 获取所有会议
function getAllConferences() {
  return conferences;
}

// 获取即将举行的会议（未来3个月）
function getUpcomingConferences(limit = 10) {
  const now = new Date();
  const threeMonthsLater = new Date();
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
  
  return conferences
    .filter(conf => {
      const confDate = new Date(conf.date);
      return confDate >= now && confDate <= threeMonthsLater;
    })
    .slice(0, limit);
}

// 按月份分组
function getConferencesByMonth() {
  const grouped = {};
  
  conferences.forEach(conf => {
    const date = new Date(conf.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!grouped[monthKey]) {
      grouped[monthKey] = [];
    }
    grouped[monthKey].push(conf);
  });
  
  return grouped;
}

// 生成ICS日历文件内容
function generateICS(conference) {
  const startDate = new Date(conference.date);
  const endDate = conference.endDate ? new Date(conference.endDate) : startDate;
  
  // 格式化日期为 ICS 格式 (YYYYMMDD)
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };
  
  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AI行业动态//会议日历//CN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${conference.id}@ai-industry-news.com
DTSTAMP:${formatDate(new Date())}T000000Z
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(new Date(endDate.getTime() + 86400000))}
SUMMARY:${conference.title}
DESCRIPTION:${conference.description}\\n\\n举办方: ${conference.organizer}\\n官网: ${conference.website}
LOCATION:${conference.location}
URL:${conference.website}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
  
  return icsContent;
}

module.exports = {
  getAllConferences,
  getUpcomingConferences,
  getConferencesByMonth,
  generateICS
};
