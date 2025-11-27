# 🚀 PM2 Dashboard - Vercel Deployment Guide

## 🎯 Overview

This guide explains how to deploy your PM2 Dashboard to Vercel. Since Vercel is a serverless platform that doesn't support PM2's server-side operations, we've created a **demo mode** that showcases the dashboard functionality with realistic mock data.

## 🔄 Two Deployment Modes

### 1. Demo Mode (Vercel Compatible) ✅
- **Use Case**: Showcasing the dashboard UI/UX
- **Features**: All visual components work with realistic mock data
- **Limitations**: No real PM2 process management
- **Perfect For**: Portfolios, demos, client presentations

### 2. Full PM2 Mode (Server Required) 🖥️
- **Use Case**: Production monitoring of real PM2 processes
- **Features**: Full PM2 integration with real process management
- **Requirements**: Server with PM2 installed
- **Perfect For**: Production monitoring, VPS/dedicated servers

## 🚀 Quick Vercel Deployment

### Step 1: Prepare for Vercel

```bash
# Switch to Vercel-compatible mode
npm run prepare-vercel
```

### Step 2: Deploy to Vercel

#### Option A: Using Vercel CLI
```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Deploy
npm run deploy-vercel
```

#### Option B: Using Vercel Dashboard
1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Deploy automatically

#### Option C: Manual Build
```bash
# Build for Vercel
npm run build-vercel

# Then upload the .next folder to Vercel
```

### Step 3: Verify Deployment

After deployment, your dashboard will:
- ✅ Show 8 mock processes with realistic data
- ✅ Display system metrics simulation
- ✅ Demonstrate all UI components
- ✅ Update data dynamically
- ⚠️ Show "Demo Mode" indicators

## 🔧 Configuration Files

### vercel.json
The deployment is configured with:
- Next.js framework detection
- Node.js 18.x runtime
- Environment variables for demo mode
- Proper API route handling

### Environment Variables
- `VERCEL_ENV=production` - Automatically set by Vercel
- `DEMO_MODE=true` - Enables demo mode
- `NODE_ENV=production` - Production optimizations

## 🎨 Demo Mode Features

### What Works in Demo Mode:
- ✅ **Process Table**: Shows 8 realistic mock processes
- ✅ **System Metrics**: Simulated CPU, memory, load averages
- ✅ **Real-time Updates**: Data changes every 5 seconds
- ✅ **Interactive UI**: All buttons and controls work
- ✅ **Charts & Graphs**: Dynamic data visualization
- ✅ **Responsive Design**: Works on all devices
- ✅ **Process Actions**: Simulated start/stop/restart operations

### Demo Mode Indicators:
- 🔹 "Demo Mode" badge in header
- 🔹 "Vercel Demo Server" hostname
- 🔹 Tooltips explaining demo limitations
- 🔹 Success messages for simulated operations

## 🔄 Reverting Changes

To switch back to full PM2 mode:

```bash
# Revert to original PM2 version
npm run revert-vercel
```

This restores the original API routes that require PM2 installation.

## 📋 Deployment Checklist

### Before Deployment:
- [ ] Run `npm run prepare-vercel`
- [ ] Test locally: `npm run dev`
- [ ] Verify demo mode indicators appear
- [ ] Check all components render correctly
- [ ] Ensure build completes: `npm run build`

### After Deployment:
- [ ] Verify Vercel URL works
- [ ] Test on mobile devices
- [ ] Check demo mode messaging
- [ ] Validate all mock data displays
- [ ] Test interactive features

## 🎯 Use Cases for Each Mode

### Demo Mode (Vercel) Perfect For:
- 📊 **Portfolio Projects**: Showcase your dashboard skills
- 🎨 **Client Presentations**: Demonstrate UI without setup
- 🚀 **Quick Demos**: Share via simple URL
- 📱 **Mobile Testing**: Test responsive design
- 🔍 **Code Reviews**: Show functionality to team

### Full PM2 Mode Perfect For:
- 🖥️ **Production Monitoring**: Real server monitoring
- 📈 **DevOps Workflows**: Integrate with CI/CD
- 🔧 **Server Management**: Actual process control
- 📊 **Performance Analysis**: Real metrics collection
- 🚨 **Alerting Systems**: Production monitoring

## 🛠️ Technical Implementation

### File Structure:
```
src/app/api/pm2/
├── route.ts              # Original PM2 integration
├── route-vercel.ts       # Vercel-compatible version
├── system/
│   ├── route.ts          # Original system API
│   └── route-vercel.ts   # Vercel-compatible version
└── ...
```

### Key Differences:

| Feature | Original Mode | Demo Mode |
|---------|--------------|----------|
| Process Data | Real PM2 commands | Mock data |
| System Info | Real system calls | Simulated metrics |
| Process Control | Actual PM2 operations | Simulated responses |
| Performance | Real-time monitoring | Realistic simulation |

## 🐛 Troubleshooting

### Common Issues:

1. **Build Failures**
   ```bash
   # Ensure you prepared for Vercel
   npm run prepare-vercel
   npm run build
   ```

2. **Missing Demo Indicators**
   - Check `DEMO_MODE=true` in environment
   - Verify Vercel-compatible routes are active

3. **API Errors**
   - Check Vercel function logs
   - Ensure all imports are correct
   - Verify mock data is properly exported

### Debug Commands:
```bash
# Check current mode
ls -la src/app/api/pm2/route.ts*

# Verify build
npm run build 2>&1 | grep -i error

# Test API locally
curl http://localhost:3000/api/pm2
```

## 🌟 Best Practices

### For Demo Deployments:
1. **Clear Messaging**: Always indicate demo mode
2. **Realistic Data**: Use believable mock values
3. **Interactive Elements**: Make buttons work even in demo
4. **Mobile Optimization**: Test on various devices
5. **Performance**: Optimize for fast loading

### For Production Servers:
1. **Security**: Implement authentication
2. **Monitoring**: Set up real alerting
3. **Backup**: Regular PM2 configuration backup
4. **Updates**: Keep PM2 and dependencies updated
5. **Logging**: Proper log rotation and management

## 🔗 Useful Links

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Your Demo Dashboard](#) (Add your Vercel URL here)

## 📞 Support

If you encounter issues:
1. Check this guide first
2. Review Vercel deployment logs
3. Test locally before deploying
4. Ensure all dependencies are installed

---

**🎉 Your PM2 Dashboard is now Vercel-ready!**

The demo mode provides a fully functional showcase of your monitoring dashboard while being deployable on Vercel's serverless platform. For production PM2 monitoring, deploy the original version to a server with PM2 installed.
</contents>