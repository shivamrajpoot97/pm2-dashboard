# 🔗 PM2 Dashboard Link System

## Like PM2 Plus Enterprise - Connect Remote Servers!

Your PM2 Dashboard now supports **server linking** just like PM2 Plus! Connect multiple remote servers to monitor all your PM2 processes from one central dashboard.

---

## 🎯 **What You Get**

### **PM2 Plus Style Features**
- ✅ **Remote Server Monitoring** - Monitor PM2 processes across multiple servers
- ✅ **Centralized Dashboard** - One dashboard for all your servers
- ✅ **Auto-Discovery** - Servers automatically appear when connected
- ✅ **Real-time Updates** - Live data from all linked servers
- ✅ **Secure Connection** - Secret-based authentication
- ✅ **Easy Setup** - One command installation

### **Enterprise Dashboard Features**
- 🖥️ **Multi-server Overview** - See all servers at a glance
- 📊 **Aggregated Metrics** - Combined CPU, memory, and process stats
- 🔄 **Real-time Sync** - Updates every 30 seconds
- 🌐 **Network Visibility** - IP addresses and hostnames
- 📈 **Historical Data** - Track server performance over time

---

## 🚀 **Quick Start Guide**

### **Step 1: Generate Link Command**

#### **Method 1: Web Dashboard (Easiest)**
1. Open your dashboard: http://localhost:3000
2. Click **"Linked Servers"** button (top-right)
3. Click **"Add Server"**
4. Enter server name: `production-server-01`
5. Click **"Create Link"**
6. **Copy the generated command** 📋

#### **Method 2: CLI Generator**
```bash
# Interactive mode
node scripts/pm2-link.js

# Quick create
node scripts/pm2-link.js create production-server-01

# With custom dashboard URL
node scripts/pm2-link.js create prod-server --url=https://your-dashboard.com:3000
```

#### **Method 3: API Call**
```bash
curl -X POST http://localhost:3000/api/pm2/link \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create-link",
    "name": "production-server-01",
    "hostname": "prod-server"
  }'
```

### **Step 2: Install Agent on Remote Server**

Run the generated command on your remote server:

```bash
# Example generated command (yours will be different)
curl -s "http://your-dashboard.com:3000/api/pm2/link/agent" | bash -s -- abc123secret def456public "http://your-dashboard.com:3000"
```

**What this does:**
1. ✅ Downloads and installs the PM2 agent
2. ✅ Connects to your dashboard
3. ✅ Starts reporting PM2 data every 30 seconds
4. ✅ Runs as a PM2 process itself (`pm2-dashboard-agent`)

### **Step 3: View Connected Servers**

- **Dashboard**: Click "Linked Servers" to see all connected servers
- **CLI**: `node scripts/pm2-link.js list`
- **API**: `GET http://localhost:3000/api/pm2/link?action=list`

---

## 📊 **Dashboard Features**

### **Linked Servers Panel**
- 🟢 **Active Servers** - Green indicators for online servers
- 🔴 **Inactive Servers** - Red indicators for offline servers
- 📈 **Real-time Metrics** - CPU load, memory usage, process count
- 🕐 **Last Seen** - When server last reported
- 🗑️ **Remove Servers** - Clean up old connections

### **Multi-Server Overview**
- **Combined Stats** - Total processes across all servers
- **Server Health** - System load and memory across fleet
- **Process Distribution** - See which processes run where
- **Alert Integration** - Know when servers go offline

---

## 🛠️ **Advanced Configuration**

### **Custom Dashboard URL**

If your dashboard is not on localhost:3000:

```bash
# Set dashboard URL
export DASHBOARD_URL="https://your-domain.com:3000"

# Or pass directly to script
node scripts/pm2-link.js create server1 --url=https://your-domain.com:3000
```

### **Agent Configuration**

The agent runs as a PM2 process on remote servers:

```bash
# Check agent status
pm2 status pm2-dashboard-agent

# View agent logs
pm2 logs pm2-dashboard-agent

# Restart agent
pm2 restart pm2-dashboard-agent

# Stop agent
pm2 stop pm2-dashboard-agent
```

### **Agent Location**
- **Installation**: `~/.pm2-agent/`
- **Logs**: `~/.pm2-agent/logs/`
- **Config**: `~/.pm2-agent/agent-ecosystem.config.js`

---

## 🔒 **Security**

### **Authentication**
- Each server has a **unique secret** and **public key**
- No passwords or tokens stored in plain text
- Communication is authenticated on every request

### **Network Security**
- Agent only **sends** data, never receives commands
- Dashboard cannot execute commands on remote servers
- All communication over HTTPS (if configured)

### **Data Privacy**
- Only PM2 process data is transmitted
- No sensitive environment variables sent
- System metrics limited to CPU, memory, load

---

## 📋 **Real-World Examples**

### **Example 1: Multi-Environment Setup**

```bash
# Development server
node scripts/pm2-link.js create dev-server

# Staging server 
node scripts/pm2-link.js create staging-server

# Production servers
node scripts/pm2-link.js create prod-web-01
node scripts/pm2-link.js create prod-web-02
node scripts/pm2-link.js create prod-api-01
node scripts/pm2-link.js create prod-worker-01
```

### **Example 2: Microservices Architecture**

```bash
# Service servers
node scripts/pm2-link.js create user-service-server
node scripts/pm2-link.js create order-service-server
node scripts/pm2-link.js create payment-service-server
node scripts/pm2-link.js create notification-server

# Infrastructure servers
node scripts/pm2-link.js create database-server
node scripts/pm2-link.js create redis-server
node scripts/pm2-link.js create nginx-proxy
```

### **Example 3: Auto-scaling Setup**

```bash
# Create links for auto-scaling group
for i in {1..5}; do
  node scripts/pm2-link.js create "web-server-$(printf "%02d" $i)"
done

# Each new server gets the link command during provisioning
```

---

## 🔧 **Troubleshooting**

### **Server Not Appearing**

1. **Check Agent Status**:
   ```bash
   pm2 status pm2-dashboard-agent  
   pm2 logs pm2-dashboard-agent
   ```

2. **Verify Network Connection**:
   ```bash
   curl -I http://your-dashboard.com:3000/api/health
   ```

3. **Check Firewall**:
   - Dashboard port (3000) must be accessible
   - No blocking between server and dashboard

### **Agent Installation Failed**

1. **Check PM2 Installation**:
   ```bash
   pm2 --version
   # If not installed: npm install -g pm2
   ```

2. **Manual Installation**:
   ```bash
   # Download agent script
   curl -o install-agent.sh "http://your-dashboard.com:3000/api/pm2/link/agent"
   
   # Run with your credentials
   bash install-agent.sh SECRET PUBLIC_KEY DASHBOARD_URL
   ```

### **Dashboard Not Showing Data**

1. **Check Dashboard URL**:
   - Ensure `DASHBOARD_URL` environment variable is set
   - Verify the URL is accessible from remote servers

2. **Check Agent Reporting**:
   ```bash
   # Look for successful reports in agent logs
   pm2 logs pm2-dashboard-agent | grep "Data reported successfully"
   ```

---

## 🚀 **Production Deployment**

### **Dashboard Server Setup**

```bash
# Set environment variables
export DASHBOARD_URL="https://pm2-dashboard.yourcompany.com"
export NODE_ENV="production"

# Start dashboard with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup
```

### **Reverse Proxy (Nginx)**

```nginx
server {
    listen 443 ssl;
    server_name pm2-dashboard.yourcompany.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### **Automated Server Provisioning**

Add to your server provisioning scripts:

```bash
#!/bin/bash
# server-setup.sh

# Install PM2
npm install -g pm2

# Connect to dashboard
curl -s "https://pm2-dashboard.yourcompany.com/api/pm2/link/agent" | bash -s -- $PM2_SECRET $PM2_PUBLIC "https://pm2-dashboard.yourcompany.com"

# Your app deployment continues...
```

---

## 📈 **Monitoring Best Practices**

### **Server Naming Convention**
- Use descriptive names: `prod-api-01`, `staging-web-server`
- Include environment: `dev-`, `staging-`, `prod-`
- Include purpose: `web-`, `api-`, `worker-`, `db-`
- Include number for scaling: `-01`, `-02`, etc.

### **Health Monitoring**
- Monitor "Last Seen" times for server health
- Set up alerts for servers going offline
- Track process counts for auto-scaling
- Monitor system resources across fleet

### **Security Practices**
- Regularly rotate link credentials
- Use HTTPS in production
- Restrict dashboard access with authentication
- Monitor agent logs for anomalies

---

## 🎯 **What You've Achieved**

### **Enterprise PM2 Monitoring**
- ✅ **Multi-server monitoring** like PM2 Plus
- ✅ **Centralized dashboard** for all your infrastructure
- ✅ **Real-time process monitoring** across your fleet
- ✅ **Secure server linking** with authentication
- ✅ **Auto-discovery** of new servers
- ✅ **Historical metrics** and performance tracking

### **Cost Savings**
- 💰 **No PM2 Plus subscription** needed
- 💰 **Self-hosted solution** - full control
- 💰 **Unlimited servers** - no per-server fees
- 💰 **Open source** - modify as needed

---

## 🔗 **Quick Commands Reference**

```bash
# Create server link (interactive)
node scripts/pm2-link.js

# Create server link (direct)
node scripts/pm2-link.js create my-server

# List linked servers
node scripts/pm2-link.js list

# Check agent status on remote server
pm2 status pm2-dashboard-agent

# View agent logs
pm2 logs pm2-dashboard-agent

# Restart agent
pm2 restart pm2-dashboard-agent
```

---

## 🎉 **You're Ready!**

**Your PM2 Dashboard now supports enterprise-level multi-server monitoring!**

### **Next Steps:**
1. 🔗 **Link your first server** using the web interface
2. 📊 **Monitor multiple servers** from one dashboard
3. 🚀 **Scale your infrastructure** with confidence
4. 📈 **Track performance** across your entire fleet

**Experience PM2 Plus features without the subscription cost! 🎯**

---

### **Support & Documentation**

- **Dashboard**: http://localhost:3000
- **Linked Servers**: http://localhost:3000 → "Linked Servers" button
- **Health Check**: http://localhost:3000/api/health
- **Link API**: http://localhost:3000/api/pm2/link

**Happy monitoring! 🚀**
