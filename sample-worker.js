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
