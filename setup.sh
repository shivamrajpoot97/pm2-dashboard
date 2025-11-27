#!/bin/bash

# PM2 Dashboard Setup Script
# This script helps you set up the PM2 Dashboard with some sample processes

echo "🚀 PM2 Dashboard Setup"
echo "====================="

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed. Installing PM2..."
    npm install -g pm2
else
    echo "✅ PM2 is already installed"
fi

# Check PM2 status
echo ""
echo "📊 Current PM2 Status:"
pm2 status

# Ask if user wants to create sample processes
echo ""
read -p "Do you want to create some sample processes for testing? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔧 Creating sample processes..."
    
    # Create a simple HTTP server
    cat > sample-server.js << 'EOF'
const http = require('http');
const port = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.url}`);
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    message: 'Hello from PM2 Dashboard Sample Server!',
    timestamp: now,
    pid: process.pid,
    uptime: process.uptime()
  }));
});

server.listen(port, () => {
  console.log(`Sample server running on port ${port}`);
});

// Simulate some activity
setInterval(() => {
  console.log(`[${new Date().toISOString()}] Heartbeat - Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
}, 10000);
EOF

    # Create a worker process
    cat > sample-worker.js << 'EOF'
console.log('Worker process started');

let counter = 0;

setInterval(() => {
  counter++;
  const memUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  console.log(`[${new Date().toISOString()}] Processing job #${counter} - Memory: ${memUsage}MB`);
  
  // Simulate some work
  if (counter % 10 === 0) {
    console.warn(`Worker completed ${counter} jobs`);
  }
  
  // Simulate occasional errors
  if (counter % 50 === 0) {
    console.error('Sample error for demonstration');
  }
}, 2000);

process.on('SIGINT', () => {
  console.log('Worker shutting down gracefully...');
  process.exit(0);
});
EOF

    # Start the sample processes
    pm2 start sample-server.js --name "sample-web-server" --instances 1
    pm2 start sample-worker.js --name "sample-worker" --instances 2
    pm2 start sample-server.js --name "sample-api" --instances 1 --env PORT=3002
    
    echo "✅ Sample processes created!"
else
    echo "⏭️  Skipping sample process creation"
fi

# Show current status
echo ""
echo "📈 Current PM2 Processes:"
pm2 status

echo ""
echo "🌐 Starting PM2 Dashboard..."
echo "The dashboard will be available at: http://localhost:3000"
echo ""
echo "📋 Available PM2 commands:"
echo "  pm2 status          - Show process status"
echo "  pm2 logs            - Show all logs
  pm2 logs <id>       - Show logs for specific process"
echo "  pm2 restart <id>    - Restart a process"
echo "  pm2 stop <id>       - Stop a process"
echo "  pm2 delete <id>     - Delete a process"
echo "  pm2 save            - Save current process list"
echo "  pm2 resurrect       - Restore saved processes"
echo ""
echo "🚀 Ready to start the dashboard!"
echo "Run: npm run dev"
