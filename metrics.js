const client = require('prom-client');

// Create a Registry to register the metrics
const register = new client.Registry();

// Add default Node.js metrics (CPU, memory, event loop, etc.)
client.collectDefaultMetrics({
  register,
  prefix: 'nodejs_',
});

// Custom application metrics

// Counter for HTTP requests
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Histogram for request duration
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

// Gauge for active connections
const activeConnections = new client.Gauge({
  name: 'http_active_connections',
  help: 'Number of active HTTP connections',
  registers: [register],
});

// Counter for database operations
const dbOperationsTotal = new client.Counter({
  name: 'db_operations_total',
  help: 'Total number of database operations',
  labelNames: ['operation', 'table', 'status'],
  registers: [register],
});

// Histogram for database operation duration
const dbOperationDuration = new client.Histogram({
  name: 'db_operation_duration_seconds',
  help: 'Duration of database operations in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

// Counter for user operations
const userOperationsTotal = new client.Counter({
  name: 'user_operations_total',
  help: 'Total number of user operations',
  labelNames: ['operation', 'status'],
  registers: [register],
});

// Gauge for application info
const appInfo = new client.Gauge({
  name: 'app_info',
  help: 'Application information',
  labelNames: ['version', 'name', 'environment'],
  registers: [register],
});

// Set app info
appInfo.set({ version: '1.0.0', name: 'node-otel-app', environment: 'development' }, 1);

// Middleware to track metrics
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Increment active connections
  activeConnections.inc();
  
  // Override res.end to capture metrics when request completes
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    const method = req.method;
    const statusCode = res.statusCode.toString();
    
    // Record metrics
    httpRequestsTotal.inc({ method, route, status_code: statusCode });
    httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
    
    // Decrement active connections
    activeConnections.dec();
    
    // Call original end method
    originalEnd.apply(this, args);
  };
  
  next();
};

module.exports = {
  register,
  metrics: {
    httpRequestsTotal,
    httpRequestDuration,
    activeConnections,
    dbOperationsTotal,
    dbOperationDuration,
    userOperationsTotal,
    appInfo
  },
  metricsMiddleware
};