# PM2 Dashboard - Process Deployment Guide

## 🚀 Deploy Applications like PM2 Plus

Your PM2 Dashboard now includes powerful deployment features that rival PM2 Plus enterprise functionality!

## 🎯 Features Available

### 1. **Web-based Deployment Interface**
- ✅ Deploy apps directly from the dashboard
- ✅ Multiple deployment methods (Simple, Ecosystem, Templates, Package.json)
- ✅ Real-time deployment feedback
- ✅ 8+ application templates

### 2. **CLI Ecosystem Generator**
- ✅ Interactive ecosystem file generator
- ✅ 8 pre-built templates (Node, Express, React, Vue, Next.js, API, Worker, Microservice)
- ✅ Custom configuration options
- ✅ Automatic PM2 deployment

### 3. **API-based Deployment**
- ✅ RESTful deployment endpoints
- ✅ Programmatic app deployment
- ✅ Integration with CI/CD pipelines

---

## 🌐 Web Dashboard Deployment

### Access the Deployment Interface

1. **Open your PM2 Dashboard**: http://localhost:3000
2. **Click "Deploy New App"** button in the top-right corner
3. **Choose your deployment method**:

#### Method 1: Simple Deployment
- **Process Name**: `my-web-app`
- **Script Path**: `./app.js` or `npm start`
- **Working Directory**: `/path/to/your/app`
- **Instances**: `1` (or more for load balancing)

#### Method 2: Application Templates
Choose from pre-configured templates:
- 🟢 **Express.js** - Web server with clustering
- ⚛️ **React** - Built and served static app
- 🟩 **Vue.js** - Built and served static app
- ⬛ **Next.js** - SSR React framework
- 🔵 **Node.js** - Simple Node application
- 🔗 **API Server** - REST API with logging
- ⚙️ **Worker** - Background job processor
- 🔧 **Microservice** - Scalable service

#### Method 3: Package.json Deployment
- **Project Path**: `/path/to/your/project`
- **Script Name**: `start` (from package.json scripts)
- **Process Name**: Auto-detected from package.json

---

## 🖥️ CLI Ecosystem Generator

### Interactive Generator

```bash
# Run the interactive generator
node scripts/pm2-generator.js

# Or use the shorthand
node scripts/pm2-generator.js generate
```

**Follow the prompts:**
1. Enter your app name
2. Select a template (1-8)
3. Configure script file, instances, port
4. Generator creates `ecosystem.config.js`
5. Optionally start the app immediately

### Quick Template Generation

```bash
# Generate specific templates
node scripts/pm2-generator.js template express my-api
node scripts/pm2-generator.js template react my-frontend
node scripts/pm2-generator.js template worker my-background-job

# List all available templates
node scripts/pm2-generator.js list
```

### Example Generated Ecosystem File

```javascript
module.exports = {
  apps: [
    {
      name: 'express-api',
      script: 'app.js',
      cwd: './',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: '3000'
      },
      max_memory_restart: '1G',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
```

---

## 🔧 API Deployment

### Available Endpoints

#### 1. Start Simple Process
```bash
curl -X POST http://localhost:3000/api/pm2/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "action": "start-simple",
    "config": {
      "name": "my-app",
      "script": "./app.js",
      "instances": 2,
      "env": {
        "NODE_ENV": "production",
        "PORT": "3000"
      }
    }
  }'
```

#### 2. Deploy with Template
```bash
curl -X POST http://localhost:3000/api/pm2/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "action": "quick-start",
    "config": {
      "type": "express",
      "name": "my-express-app",
      "port": 3001,
      "instances": 4
    }
  }'
```

#### 3. Deploy from Package.json
```bash
curl -X POST http://localhost:3000/api/pm2/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "action": "start-from-package-json",
    "config": {
      "path": "/path/to/project",
      "name": "my-project",
      "script": "start",
      "instances": 2
    }
  }'
```

#### 4. Get Available Templates
```bash
curl http://localhost:3000/api/pm2/deploy?action=templates
```

---

## 📋 Deployment Examples

### Example 1: Deploy Express.js API

**Via Web Interface:**
1. Click "Deploy New App"
2. Go to "Templates" tab
3. Select "Express.js Server"
4. Name: `user-api`
5. Port: `3001`
6. Click "Deploy with Template"

**Via CLI:**
```bash
node scripts/pm2-generator.js template express user-api
pm2 start ecosystem.config.js
```

### Example 2: Deploy React Frontend

**Preparation:**
```bash
# Build your React app first
npm run build
```

**Deploy:**
1. Template: "React Application"
2. Name: `my-frontend`
3. Port: `3000`
4. The template automatically serves from `build/` directory

### Example 3: Deploy Background Worker

```bash
# Generate worker ecosystem
node scripts/pm2-generator.js template worker email-processor

# Deploy with 4 worker instances
pm2 start ecosystem.config.js
```

### Example 4: Deploy Microservice Architecture

```javascript
// Generate multiple services
module.exports = {
  apps: [
    {
      name: 'api-gateway',
      script: 'gateway.js',
      instances: 2,
      env: { PORT: 3000 }
    },
    {
      name: 'user-service',
      script: 'user-service.js',
      instances: 2,
      env: { PORT: 3001 }
    },
    {
      name: 'order-service',
      script: 'order-service.js',
      instances: 2,
      env: { PORT: 3002 }
    },
    {
      name: 'notification-worker',
      script: 'notification-worker.js',
      instances: 1,
      exec_mode: 'fork'
    }
  ]
};
```

---

## 🎛️ Advanced Configuration

### Environment-specific Deployments

```javascript
module.exports = {
  apps: [{
    name: 'my-app',
    script: 'app.js',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    env_staging: {
      NODE_ENV: 'staging',
      PORT: 3001
    }
  }],
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:username/repo.git',
      path: '/var/www/production',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production'
    }
  }
};
```

### Load Balancing Configuration

```javascript
{
  name: 'load-balanced-app',
  script: 'app.js',
  instances: 'max', // Use all CPU cores
  exec_mode: 'cluster',
  env: {
    NODE_ENV: 'production'
  },
  max_memory_restart: '1G',
  node_args: ['--optimize_for_size', '--max_old_space_size=460']
}
```

### Monitoring and Logging

```javascript
{
  name: 'monitored-app',
  script: 'app.js',
  error_file: './logs/err.log',
  out_file: './logs/out.log',
  log_file: './logs/combined.log',
  time: true,
  log_date_format: 'YYYY-MM-DD HH:mm Z',
  merge_logs: true,
  max_restarts: 10,
  min_uptime: '10s',
  restart_delay: 4000
}
```

---

## 🚨 Best Practices

### 1. **Process Naming**
- Use descriptive names: `user-api`, `frontend-app`, `email-worker`
- Include environment: `user-api-prod`, `frontend-staging`

### 2. **Resource Management**
- Set memory limits: `max_memory_restart: '1G'`
- Configure instances based on CPU cores
- Use `cluster` mode for web apps, `fork` for workers

### 3. **Environment Variables**
- Keep secrets in environment files
- Use different configs for dev/staging/prod
- Never commit sensitive data to version control

### 4. **Logging**
- Configure separate error and output logs
- Use log rotation: `pm2 install pm2-logrotate`
- Monitor log files regularly

### 5. **Health Monitoring**
- Set up restart limits: `max_restarts: 10`
- Configure minimum uptime: `min_uptime: '10s'`
- Use health checks for critical services

---

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to PM2
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm install
        
      - name: Build application
        run: npm run build
        
      - name: Deploy to PM2
        run: |
          curl -X POST ${{ secrets.PM2_DASHBOARD_URL }}/api/pm2/deploy \
            -H "Content-Type: application/json" \
            -d '{
              "action": "start-ecosystem",
              "config": {
                "apps": [{
                  "name": "my-app-prod",
                  "script": "dist/server.js",
                  "instances": "max",
                  "env": {
                    "NODE_ENV": "production"
                  }
                }]
              }
            }'
```

---

## 🎉 You're Ready!

### Quick Start Checklist

- [ ] ✅ Dashboard is running at http://localhost:3000
- [ ] ✅ PM2 is installed (`npm install -g pm2`)
- [ ] ✅ Click "Deploy New App" to start
- [ ] ✅ Try the CLI generator: `node scripts/pm2-generator.js`
- [ ] ✅ Deploy your first app!

### What You Can Do Now

1. **Deploy any Node.js application** with a few clicks
2. **Scale applications** with clustering and load balancing
3. **Monitor processes** in real-time with the dashboard
4. **Manage logs** with built-in log viewer
5. **Create ecosystem files** for complex deployments
6. **Integrate with CI/CD** for automated deployments

**Your PM2 Dashboard now provides enterprise-level deployment capabilities! 🚀**

---

## 🔗 Quick Links

- **Dashboard**: http://localhost:3000
- **Deploy API**: http://localhost:3000/api/pm2/deploy
- **Health Check**: http://localhost:3000/api/health
- **Templates**: http://localhost:3000/api/pm2/deploy?action=templates

Happy deploying! 🎯
