module.exports = {
  apps: [
    {
      name: 'pm2-dashboard',
      script: 'npm',
      args: 'start',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      error_file: './logs/pm2-dashboard-err.log',
      out_file: './logs/pm2-dashboard-out.log',
      log_file: './logs/pm2-dashboard-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      watch: false,
      ignore_watch: [
        'node_modules',
        'logs',
        '.next'
      ],
      // Health monitoring
      pmx: true,
      // Auto restart if memory usage exceeds limit
      kill_timeout: 3000,
      // Graceful shutdown
      listen_timeout: 8000,
      // Source map support for better error tracking
      source_map_support: true,
      // Environment variables
      env_file: '.env.production'
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:username/pm2-dashboard.git',
      path: '/var/www/pm2-dashboard',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      'ssh_options': 'ForwardAgent=yes'
    },
    staging: {
      user: 'deploy',
      host: 'staging-server.com',
      ref: 'origin/develop',
      repo: 'git@github.com:username/pm2-dashboard.git',
      path: '/var/www/pm2-dashboard-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging',
        PORT: 3001
      }
    }
  }
};
