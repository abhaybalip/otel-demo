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
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// Counter for business events
const businessEventsTotal = new client.Counter({
  name: 'business_events_total',
  help: 'Total number of business events',
  labelNames: ['event_type', 'status'],
  registers: [register],
});

// Gauge for current users
const currentUsers = new client.Gauge({
  name: 'current_users_count',
  help: 'Number of currently active users',
  labelNames: ['user_type'],
  registers: [register],
});

// Summary for response sizes
const responseSizeBytes = new client.Summary({
  name: 'http_response_size_bytes',
  help: 'Size of HTTP responses in bytes',
  labelNames: ['method', 'route', 'status_code'],
  percentiles: [0.5, 0.9, 0.95, 0.99],
  registers: [register],
});

// Grouped metrics object for easy access
const metrics = {
  register,
  httpRequestsTotal,
  httpRequestDuration,
  activeConnections,
  dbOperationsTotal,
  dbOperationDuration,
  businessEventsTotal,
  currentUsers,
  responseSizeBytes,
};

/**
 * Middleware to automatically track HTTP request metrics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function metricsMiddleware(req, res, next) {
  const startTime = Date.now();
  
  // Increment active connections
  activeConnections.inc();
  
  // Override res.end to capture metrics when response is sent
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = (Date.now() - startTime) / 1000;
    const route = req.route ? req.route.path : req.path || 'unknown';
    const method = req.method;
    const statusCode = res.statusCode.toString();
    
    // Record metrics
    httpRequestsTotal.inc({ method, route, status_code: statusCode });
    httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
    
    // Track response size if available
    const contentLength = res.get('Content-Length');
    if (contentLength) {
      responseSizeBytes.observe(
        { method, route, status_code: statusCode }, 
        parseInt(contentLength, 10)
      );
    }
    
    // Decrement active connections
    activeConnections.dec();
    
    // Call original end function
    originalEnd.apply(this, args);
  };
  
  next();
}

/**
 * Create a timer for measuring operation duration
 * @param {Object} metric - Histogram or Summary metric
 * @param {Object} labels - Labels for the metric
 * @returns {Function} Function to call when operation is complete
 */
function createTimer(metric, labels = {}) {
  const startTime = process.hrtime.bigint();
  
  return () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e9; // Convert to seconds
    metric.observe(labels, duration);
  };
}

/**
 * Increment a counter metric safely
 * @param {Object} counter - Counter metric
 * @param {Object} labels - Labels for the metric
 * @param {number} value - Value to increment by (default: 1)
 */
function incrementCounter(counter, labels = {}, value = 1) {
  try {
    counter.inc(labels, value);
  } catch (error) {
    console.error('Error incrementing counter:', error);
  }
}

/**
 * Set a gauge metric value safely
 * @param {Object} gauge - Gauge metric
 * @param {Object} labels - Labels for the metric
 * @param {number} value - Value to set
 */
function setGauge(gauge, labels = {}, value) {
  try {
    gauge.set(labels, value);
  } catch (error) {
    console.error('Error setting gauge:', error);
  }
}

/**
 * Create custom metrics with the same registry
 * @param {string} type - Metric type ('counter', 'gauge', 'histogram', 'summary')
 * @param {Object} config - Metric configuration
 * @returns {Object} Created metric
 */
function createCustomMetric(type, config) {
  const MetricClass = client[type.charAt(0).toUpperCase() + type.slice(1)];
  if (!MetricClass) {
    throw new Error(`Unknown metric type: ${type}`);
  }
  
  return new MetricClass({
    ...config,
    registers: [register],
  });
}

module.exports = {
  register,
  metrics,
  metricsMiddleware,
  createTimer,
  incrementCounter,
  setGauge,
  createCustomMetric,
  
  // Export individual metrics for direct access
  ...metrics,
};