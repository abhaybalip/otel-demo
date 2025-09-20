/**
 * OpenTelemetry Node.js Example Application
 * 
 * A well-organized Express application demonstrating OpenTelemetry tracing,
 * proper error handling, and modular architecture.
 * 
 * IMPORTANT: The telemetry configuration must be imported first
 * to ensure proper instrumentation of all modules.
 */

// Initialize OpenTelemetry first
require('./src/config/telemetry');

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const config = require('./src/config/environment');

// Import middleware
const { createRequestLogger } = require('./src/middleware/logging');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');

// Import routes
const healthRoutes = require('./src/routes/health');
const apiRoutes = require('./src/routes/api');

// Import utilities
const { GracefulShutdown, formatStartupMessage } = require('./src/utils/server');

/**
 * Create and configure Express application
 */
function createApp() {
  const app = express();

  // Basic middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Serve static files for the dashboard UI
  app.use('/dashboard', express.static('public'));
  
  // Redirect root to dashboard
  app.get('/dashboard', (req, res) => {
    res.redirect('/dashboard/');
  });

  // Custom middleware
  app.use(createRequestLogger());

  // Routes
  app.use('/health', healthRoutes);
  app.use('/', apiRoutes);

  // Error handling middleware (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

/**
 * Start the server
 */
function startServer() {
  const app = createApp();
  const { port, host } = config.server;

  // Create HTTP server and Socket.IO instance
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Set up WebSocket connections for real-time dashboard updates
  io.on('connection', (socket) => {
    console.log('Dashboard client connected:', socket.id);
    
    // Send initial data
    socket.emit('metrics', getMockMetrics());
    socket.emit('traces', getMockTraces());
    
    socket.on('disconnect', () => {
      console.log('Dashboard client disconnected:', socket.id);
    });
  });

  // Send periodic updates to connected clients
  setInterval(() => {
    io.emit('metrics', getMockMetrics());
    io.emit('traces', getMockTraces());
  }, 5000); // Update every 5 seconds

  server.listen(port, () => {
    console.log(formatStartupMessage(port, host));
    console.log(`📊 Dashboard available at: http://${host || 'localhost'}:${port}/dashboard`);
  });

  // Set up graceful shutdown
  const gracefulShutdown = new GracefulShutdown(server);
  gracefulShutdown.setupHandlers();

  return server;
}

// Mock data functions for WebSocket updates
function getMockMetrics() {
  return {
    timestamp: new Date().toISOString(),
    totalRequests: Math.floor(Math.random() * 1000) + 100,
    avgResponseTime: Math.floor(Math.random() * 500) + 50,
    errorRate: Math.random() * 5,
    requestsPerMin: Math.floor(Math.random() * 60) + 10,
    system: {
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      },
      cpu: Math.random() * 100
    }
  };
}

function getMockTraces() {
  const operations = ['GET /', 'GET /health', 'GET /slow', 'GET /error'];
  const traces = [];
  
  for (let i = 0; i < 5; i++) {
    const operation = operations[Math.floor(Math.random() * operations.length)];
    traces.push({
      traceId: generateTraceId(),
      operation: operation,
      duration: Math.floor(Math.random() * 1000) + 10,
      status: Math.random() > 0.1 ? 200 : 500,
      timestamp: new Date().toISOString()
    });
  }
  
  return traces;
}

function generateTraceId() {
  return Array.from({length: 8}, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

// Start the server if this file is executed directly
if (require.main === module) {
  startServer();
}

// Export for testing
module.exports = {
  createApp,
  startServer
};