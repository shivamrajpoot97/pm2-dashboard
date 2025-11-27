import { NextResponse } from 'next/server';

// GET: Serve the PM2 agent installation script
export async function GET() {
  const agentScript = `#!/bin/bash

# PM2 Dashboard Agent Installation Script
# This script connects a remote server to the PM2 Dashboard

set -e

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

# Arguments
SECRET="$1"
PUBLIC_KEY="$2"
DASHBOARD_URL="$3"

if [ -z "$SECRET" ] || [ -z "$PUBLIC_KEY" ] || [ -z "$DASHBOARD_URL" ]; then
    echo -e "\${RED}❌ Error: Missing required arguments\${NC}"
    echo "Usage: \$0 <secret> <public_key> <dashboard_url>"
    echo "Example: \$0 abc123... def456... http://your-dashboard.com:3000"
    exit 1
fi

echo -e "\\\${BLUE}🚀 PM2 Dashboard Agent Installer\\\${NC}"
echo "====================================="
echo -e "Dashboard URL: \${YELLOW}\$DASHBOARD_URL\${NC}"
echo -e "Server: \${YELLOW}\$(hostname)\${NC}"
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "\${RED}❌ PM2 is not installed. Installing PM2...\${NC}"
    if command -v npm &> /dev/null; then
        npm install -g pm2
    elif command -v yarn &> /dev/null; then
        yarn global add pm2
    else
        echo -e "\${RED}❌ Neither npm nor yarn found. Please install Node.js first.\${NC}"
        exit 1
    fi
else
    echo -e "\${GREEN}✅ PM2 is installed\${NC}"
fi

# Create PM2 agent directory
AGENT_DIR="\$HOME/.pm2-agent"
mkdir -p "\$AGENT_DIR"

# Create the PM2 reporter script
cat > "\$AGENT_DIR/pm2-reporter.js" << 'EOF'
#!/usr/bin/env node

const { exec } = require('child_process');
const https = require('https');
const http = require('http');
const os = require('os');
const url = require('url');

class PM2Agent {
  constructor(secret, publicKey, dashboardUrl) {
    this.secret = secret;
    this.publicKey = publicKey;
    this.dashboardUrl = dashboardUrl;
    this.isRunning = false;
    this.reportInterval = 30000; // 30 seconds
  }

  async getPM2Data() {
    return new Promise((resolve) => {
      exec('pm2 jlist', (error, stdout) => {
        if (error) {
          console.warn('PM2 not running or no processes found');
          resolve([]);
          return;
        }
        try {
          const processes = JSON.parse(stdout || '[]');
          resolve(processes);
        } catch {
          console.error('Failed to parse PM2 data');
          resolve([]);
        }
      });
    });
  }

  getSystemInfo() {
    return {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      uptime: os.uptime(),
      totalmem: os.totalmem(),
      freemem: os.freemem(),
      loadavg: os.loadavg(),
      cpu_count: os.cpus().length,
      node_version: process.version
    };
  }

  async getNetworkInterfaces() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (!iface.internal && iface.family === 'IPv4') {
          return iface.address;
        }
      }
    }
    return 'unknown';
  }

  async reportData() {
    try {
      const pm2Data = await this.getPM2Data();
      const systemInfo = this.getSystemInfo();
      const ip = await this.getNetworkInterfaces();
      
      const data = {
        action: 'report-data',
        secret: this.secret,
        publicKey: this.publicKey,
        hostname: os.hostname(),
        ip,
        pm2Data,
        systemInfo,
        timestamp: Date.now()
      };
      const postData = JSON.stringify(data);
      const parsedUrl = url.parse(this.dashboardUrl);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: '/api/pm2/link',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = client.request(options, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(responseData);
            if (response.success) {
              console.log(\`[\${new Date().toISOString()}] ✅ Data reported successfully\`);
              if (response.nextReport) this.reportInterval = response.nextReport;
            } else {
              console.error(\`[\${new Date().toISOString()}] ❌ Report failed:\`, response.error);
            }
          } catch {
            console.error(\`[\${new Date().toISOString()}] ❌ Failed to parse response\`);
          }
        });
      });

      req.on('error', error => {
        console.error(\`[\${new Date().toISOString()}] ❌ Network error:\`, error.message);
      });

      req.write(postData);
      req.end();
    } catch (error) {
      console.error(\`[\${new Date().toISOString()}] ❌ Report error:\`, error);
    }
  }

  start() {
    if (this.isRunning) {
      console.log('PM2 Agent is already running');
      return;
    }
    this.isRunning = true;
    console.log(\`[\${new Date().toISOString()}] 🚀 PM2 Agent started\`);
    console.log(\`[\${new Date().toISOString()}] 📡 Reporting to: \${this.dashboardUrl}\`);
    console.log(\`[\${new Date().toISOString()}] ⏱️  Report interval: \${this.reportInterval}ms\`);
    
    this.reportData();
    this.intervalId = setInterval(() => this.reportData(), this.reportInterval);
    
    process.on('SIGINT', () => {
      console.log(\`\\n[\${new Date().toISOString()}] 🛑 Shutting down PM2 Agent...\`);
      this.stop();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      console.log(\`\\n[\${new Date().toISOString()}] 🛑 Shutting down PM2 Agent...\`);
      this.stop();
      process.exit(0);
    });
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.isRunning = false;
    console.log(\`[\${new Date().toISOString()}] ⏹️  PM2 Agent stopped\`);
  }
}

if (require.main === module) {
  const [,, secret, publicKey, dashboardUrl] = process.argv;
  if (!secret || !publicKey || !dashboardUrl) {
    console.error('❌ Usage: node pm2-reporter.js <secret> <public_key> <dashboard_url>');
    process.exit(1);
  }
  new PM2Agent(secret, publicKey, dashboardUrl).start();
}

module.exports = PM2Agent;
EOF

# Make the reporter executable
chmod +x "\$AGENT_DIR/pm2-reporter.js"

# Create PM2 ecosystem file for the agent
cat > "\$AGENT_DIR/agent-ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: 'pm2-dashboard-agent',
    script: '\$AGENT_DIR/pm2-reporter.js',
    args: ['\$SECRET', '\$PUBLIC_KEY', '\$DASHBOARD_URL'],
    cwd: '\$AGENT_DIR',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 5000,
    env: {
      NODE_ENV: 'production'
    },
    error_file: '\$AGENT_DIR/logs/agent-err.log',
    out_file: '\$AGENT_DIR/logs/agent-out.log',
    log_file: '\$AGENT_DIR/logs/agent.log',
    time: true
  }]
};
EOF

# Create logs directory
mkdir -p "\$AGENT_DIR/logs"

# Stop existing agent if running
pm2 delete pm2-dashboard-agent 2>/dev/null || true

# Start the PM2 agent
echo -e "\${BLUE}🔄 Starting PM2 Dashboard Agent...\${NC}"
pm2 start "\$AGENT_DIR/agent-ecosystem.config.js"

# Save PM2 configuration
pm2 save

echo ""
echo -e "\\\${GREEN}✅ PM2 Dashboard Agent installed successfully!\\\${NC}"
echo "====================================="
echo -e "Agent Status: \\\${GREEN}Running\\\${NC}"
echo -e "Dashboard: \${YELLOW}\$DASHBOARD_URL\${NC}"
echo -e "Server: \${YELLOW}\$(hostname)\${NC}"
echo ""
echo "🔍 To check agent status:"
echo "   pm2 status"
echo "   pm2 logs pm2-dashboard-agent"
echo ""
echo "🛑 To stop the agent:"
echo "   pm2 stop pm2-dashboard-agent"
echo ""
echo "🔄 To restart the agent:"
echo "   pm2 restart pm2-dashboard-agent"
echo ""
echo -e "\\\${BLUE}📡 The agent will now report to your dashboard every 30 seconds\\\${NC}"
echo -e "\\\${BLUE}🎯 Check your dashboard to see this server appear in the linked servers section\\\${NC}"
echo ""
`;

  return new Response(agentScript, {
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': 'attachment; filename="install-pm2-agent.sh"'
    }
  });
}
