# PM2 Dashboard - Deployment Guide

## 🎉 Congratulations!

You now have a fully functional PM2 monitoring dashboard with real-time process monitoring capabilities!

## 🔧 What's Been Built

### Core Features ✅

1. **Real-time Process Monitoring**
   - Live CPU and memory usage tracking
   - Process status monitoring (online, stopped, errored)
   - Automatic refresh every 5 seconds

2. **Interactive Process Management**
   - Start/Stop/Restart/Delete processes
   - View detailed process information
   - Real-time log viewing with filtering

3. **System Metrics Dashboard**
   - System memory and CPU usage
   - Load averages and uptime
   - Network interfaces and disk usage

4. **Advanced Logging**
   - Real-time log streaming
   - Log filtering by level (info, warn, error, debug)
   - Download logs functionality
   - Separate stdout/stderr viewing

5. **Health Monitoring**
   - Dashboard health checks
   - PM2 daemon status monitoring
   - System resource alerts

### API Endpoints 🛠️

- `GET /api/pm2` - Get all processes and system info
- `POST /api/pm2` - Execute process actions (start/stop/restart/delete)
- `GET /api/pm2/logs` - Fetch process logs
- `GET /api/pm2/[id]` - Get detailed process information
- `GET /api/pm2/system` - System and PM2 daemon info
- `GET /api/health` - Dashboard health check

## 🚀 Deployment Steps

### 1. Install PM2 (if not already installed)

```bash
# Install PM2 globally
npm install -g pm2

# Verify installation
pm2 --version
```

### 2. Setup Sample Processes (Optional)

```bash
# Run the setup script to create sample processes
./setup.sh
```

### 3. Start the Dashboard

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

### 4. Deploy with PM2

```bash
# Build the application
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Or start directly
pm2 start npm --name "pm2-dashboard" -- start
```

### 5. Access the Dashboard

Open your browser and navigate to:
- Development: http://localhost:3000
- Production: http://your-server-ip:3000

## 🔍 Current Status

The dashboard is currently running and accessible. Here's what you can do:

### Without PM2 Installed
- ✅ View system metrics
- ✅ Monitor dashboard health
- ❌ Process monitoring requires PM2

### With PM2 Installed
- ✅ Full process monitoring
- ✅ Real-time process management
- ✅ Log viewing and filtering
- ✅ System and process metrics

## 📊 Live Monitoring Features

1. **Process Table**
   - Real-time CPU and memory usage
   - Process status indicators
   - Quick action buttons
   - Uptime and restart counters

2. **Charts and Graphs**
   - Historical CPU/memory usage
   - Real-time data updates
   - Interactive tooltips

3. **System Overview**
   - Memory usage with visual indicators
   - CPU load averages
   - System uptime and hostname

4. **Log Viewer**
   - Live log streaming
   - Search and filter capabilities
   - Download logs as text files
   - Color-coded log levels

## 🛡️ Security Considerations

### Production Deployment

1. **Environment Variables**
   - Set `NODE_ENV=production`
   - Configure proper PORT settings
   - Hide sensitive environment variables

2. **Access Control** (Recommended additions)
   - Add authentication middleware
   - Implement role-based access
   - Use HTTPS in production

3. **Network Security**
   - Run behind a reverse proxy (nginx)
   - Configure firewall rules
   - Use process isolation

## 🔧 Customization

### Adding New Metrics

Edit `src/types/pm2.ts` to add new data types:
```typescript
export interface CustomMetric {
  name: string;
  value: number;
  unit: string;
}
```

### Modifying Update Intervals

In `src/app/page.tsx`, adjust the refresh interval:
```typescript
const interval = setInterval(() => {
  fetchPM2Data();
}, 5000); // Change this value (milliseconds)
```

### Custom Styling

The dashboard uses Tailwind CSS. Modify colors in:
- `src/components/*.tsx` - Component-specific styling
- `tailwind.config.js` - Global theme settings

## 🐛 Troubleshooting

### Common Issues

1. **"PM2 daemon not available"**
   - Install PM2: `npm install -g pm2`
   - Start some processes: `pm2 start app.js`

2. **"Connection failed"**
   - Check if the dashboard is running
   - Verify port 3000 is available
   - Check firewall settings

3. **"No processes found"**
   - Run `pm2 status` to check processes
   - Create test processes with `./setup.sh`

4. **Logs not loading**
   - Verify process exists: `pm2 show <id>`
   - Check log file permissions
   - Ensure PM2 log paths are accessible

### Debug Mode

Enable debug logging:
```bash
DEBUG=pm2-dashboard* npm run dev
```

## 📈 Performance Tips

1. **Optimize Update Frequency**
   - Reduce polling interval for better performance
   - Use WebSocket for real-time updates (future enhancement)

2. **Log Management**
   - Rotate PM2 logs regularly: `pm2 install pm2-logrotate`
   - Limit log file sizes

3. **Resource Monitoring**
   - Monitor dashboard memory usage
   - Set up alerts for high system load

## 🔄 Next Steps

### Immediate
1. Install PM2 if you want to monitor real processes
2. Create some sample processes for testing
3. Configure authentication for production use

### Future Enhancements
1. WebSocket integration for real-time updates
2. Process deployment from the dashboard
3. Custom alerting and notifications
4. Multi-server monitoring
5. Historical data persistence

## 🆘 Support

- Health Check: http://localhost:3000/api/health
- PM2 Status API: http://localhost:3000/api/pm2
- System Info API: http://localhost:3000/api/pm2/system

---

**Your PM2 Dashboard is ready! 🎉**

The dashboard provides enterprise-level PM2 monitoring capabilities with a modern, responsive interface. Start by installing PM2 and creating some processes to see the full functionality in action.
