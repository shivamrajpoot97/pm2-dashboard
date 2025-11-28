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
