/**
 * PM2 生态系统配置文件
 * 用于在腾讯云服务器上运行应用
 *
 * 使用方法：
 * pm2 start ecosystem.config.js       # 启动应用
 * pm2 restart ecosystem.config.js     # 重启应用
 * pm2 stop ecosystem.config.js        # 停止应用
 * pm2 delete ecosystem.config.js      # 删除应用
 * pm2 logs wechat-rss                 # 查看日志
 */

module.exports = {
  apps: [
    {
      // 应用名称
      name: 'wechat-rss',

      // 启动脚本
      script: './server.js',

      // 应用描述
      description: '微信公众号 RSS 聚合系统',

      // ==================== 进程管理 ====================
      // 运行实例数量
      // 'max' 表示根据 CPU 核心数自动设置
      // 如服务器 CPU 为 2 核，则启动 2 个进程
      instances: 'max',

      // 执行模式
      // cluster: 集群模式（多进程）
      // fork: 单进程模式
      exec_mode: 'cluster',

      // ==================== 环境变量 ====================
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },

      // 生产环境变量
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        DB_PATH: '/data/articles.db',
        CONFIG_PATH: '/data',
        LOG_DIR: '/var/log/wechat-rss'
      },

      // ==================== 日志配置 ====================
      // 错误日志文件路径
      error_file: './logs/error.log',

      // 标准输出日志文件路径
      out_file: './logs/out.log',

      // 日志日期格式
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // 合并所有进程的日志
      merge_logs: true,

      // ==================== 文件监控 ====================
      // 监听文件变化自动重启（开发环境）
      watch: false,

      // 忽略监听的文件/目录
      ignore_watch: [
        'node_modules',
        'logs',
        'public/cache',
        'articles.db',
        '.git'
      ],

      // ==================== 内存管理 ====================
      // 单个进程最大内存占用，超过则重启
      // 500M 适合中等流量网站，可根据需要调整
      max_memory_restart: '500M',

      // ==================== 启动管理 ====================
      // 应用最小运行时间（未达到此时间就挂了，不自动重启）
      min_uptime: '10s',

      // 最大重启次数（时间窗口内）
      max_restarts: 10,

      // 时间窗口（分钟）
      autorestart: true,

      // ==================== 优雅关闭 ====================
      // 强制杀死进程前的等待时间（毫秒）
      kill_timeout: 5000,

      // 监听 SIGINT 信号（Ctrl+C）
      listen_timeout: 3000,

      // ==================== 通用配置 ====================
      // 禁用自动检查更新
      update_env: true,

      // 最大文件描述符数（高并发场景需要调高）
      // max_fd: 4096,
    }
  ],

  // ==================== 部署配置 ====================
  deploy: {
    production: {
      // 用户名和服务器地址
      user: 'ubuntu',
      host: '43.167.164.233',
      ref: 'origin/main',
      repo: 'https://github.com/your-username/wechat-rss-aggregator.git',
      path: '/home/ubuntu/wechat-rss-aggregator',

      // 部署前执行的命令
      'pre-deploy-local': 'echo "开始部署..."',

      // 部署时执行的命令
      'post-deploy': 'npm install --production && pm2 restart ecosystem.config.js --env production',

      // 部署后执行的命令
      'pre-deploy': 'echo "部署完成"'
    },

    development: {
      user: 'ubuntu',
      host: '43.167.164.233',
      ref: 'origin/develop',
      repo: 'https://github.com/your-username/wechat-rss-aggregator.git',
      path: '/home/ubuntu/wechat-rss-aggregator-dev',
      'post-deploy': 'npm install && pm2 restart ecosystem.config.js --env development'
    }
  }
};
