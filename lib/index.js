const { register, metrics, metricsMiddleware } = require('./prometheus');
const { initializeTelemetry, getTracer } = require('./telemetry');
const { createMonitoringEndpoints } = require('./endpoints');

/**
 * Node.js Monitoring Library
 * Provides OpenTelemetry tracing and Prometheus metrics for Express.js applications
 */

// Initialize telemetry automatically when this module is loaded
initializeTelemetry();

/**
 * Add monitoring to an Express app
 * @param {Object} app - Express application instance
 * @param {Object} options - Configuration options
 * @param {boolean} options.addEndpoints - Whether to add /metrics and /health endpoints (default: true)
 * @param {string} options.metricsPath - Path for metrics endpoint (default: '/metrics')
 * @param {string} options.healthPath - Path for health endpoint (default: '/health')
 */
function addMonitoring(app, options = {}) {
  const {
    addEndpoints = true,
    metricsPath = '/metrics',
    healthPath = '/health'
  } = options;

  // Add metrics middleware
  app.use(metricsMiddleware);

  // Add monitoring endpoints if requested
  if (addEndpoints) {
    createMonitoringEndpoints(app, { metricsPath, healthPath });
  }

  return {
    tracer: getTracer(),
    metrics,
    register
  };
}

/**
 * Create a custom tracer for your application
 * @param {string} name - Service name
 * @param {string} version - Service version
 * @returns {Object} OpenTelemetry tracer
 */
function createTracer(name, version = '1.0.0') {
  return getTracer(name, version);
}

/**
 * Create custom metrics
 * @returns {Object} Prometheus client for creating custom metrics
 */
function createCustomMetrics() {
  const client = require('prom-client');
  return {
    client,
    register,
    Counter: client.Counter,
    Gauge: client.Gauge,
    Histogram: client.Histogram,
    Summary: client.Summary
  };
}

module.exports = {
  // Main integration function
  addMonitoring,
  
  // Individual components
  metrics,
  register,
  metricsMiddleware,
  createMonitoringEndpoints,
  
  // Tracing
  createTracer,
  getTracer,
  
  // Custom metrics creation
  createCustomMetrics,
  
  // Manual initialization (if needed)
  initializeTelemetry
};