/**
 * API Routes
 * 
 * Main application API endpoints.
 */

const express = require('express');
const router = express.Router();
const config = require('../config/environment');

/**
 * Welcome endpoint
 */
router.get('/', (req, res) => {
  const response = {
    message: 'Hello, OpenTelemetry!',
    timestamp: new Date().toISOString(),
    service: {
      name: config.telemetry.serviceName,
      version: config.telemetry.serviceVersion,
      environment: config.server.environment
    },
    request: {
      method: req.method,
      path: req.path,
      headers: {
        'user-agent': req.get('User-Agent'),
        'content-type': req.get('Content-Type')
      }
    }
  };

  res.json(response);
});

/**
 * Slow endpoint for testing tracing performance
 */
router.get('/slow', async (req, res) => {
  // Get delay from query parameter or use random value
  const minDelay = 500;
  const maxDelay = 1500;
  const customDelay = parseInt(req.query.delay, 10);
  
  let delay;
  if (customDelay && customDelay > 0 && customDelay <= 10000) {
    delay = customDelay;
  } else {
    delay = Math.random() * (maxDelay - minDelay) + minDelay;
  }

  // Simulate async work
  await new Promise(resolve => setTimeout(resolve, delay));

  const response = {
    message: 'This was a slow request',
    delay: `${Math.round(delay)}ms`,
    timestamp: new Date().toISOString(),
    service: config.telemetry.serviceName,
    request_id: req.get('X-Request-ID') || 'none'
  };

  res.json(response);
});

/**
 * Error endpoint for testing error handling and tracing
 */
router.get('/error', (req, res, next) => {
  const errorType = req.query.type || 'generic';
  
  let error;
  switch (errorType) {
    case 'validation':
      error = new Error('Validation failed: Invalid input parameters');
      error.status = 400;
      break;
    case 'auth':
      error = new Error('Authentication required');
      error.status = 401;
      break;
    case 'forbidden':
      error = new Error('Access forbidden');
      error.status = 403;
      break;
    case 'notfound':
      error = new Error('Resource not found');
      error.status = 404;
      break;
    default:
      error = new Error('Intentional server error for testing');
      error.status = 500;
  }

  next(error);
});

/**
 * Echo endpoint for testing request/response data
 */
router.all('/echo', (req, res) => {
  const echo = {
    message: 'Echo endpoint - returns request information',
    timestamp: new Date().toISOString(),
    request: {
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      headers: req.headers,
      body: req.body,
      params: req.params
    },
    service: config.telemetry.serviceName
  };

  res.json(echo);
});

/**
 * Metrics endpoint for dashboard
 */
router.get('/metrics', (req, res) => {
  // In a real application, these would come from your metrics collector
  // For demo purposes, we'll return mock data
  const metrics = {
    timestamp: new Date().toISOString(),
    service: {
      name: config.telemetry.serviceName,
      version: config.telemetry.serviceVersion,
      environment: config.server.environment,
      uptime: process.uptime()
    },
    system: {
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      },
      cpu: {
        usage: Math.random() * 100 // Mock CPU usage
      }
    },
    http: {
      totalRequests: Math.floor(Math.random() * 1000) + 100,
      requestsPerMinute: Math.floor(Math.random() * 60) + 10,
      averageResponseTime: Math.floor(Math.random() * 500) + 50,
      errorRate: Math.random() * 5 // 0-5% error rate
    }
  };

  res.json(metrics);
});

/**
 * Traces endpoint for dashboard
 */
router.get('/traces', (req, res) => {
  // In a real application, these would come from your tracing backend
  // For demo purposes, we'll return mock trace data
  const traces = [];
  const operations = ['GET /', 'GET /health', 'GET /slow', 'GET /error', 'POST /echo'];
  
  for (let i = 0; i < 10; i++) {
    const operation = operations[Math.floor(Math.random() * operations.length)];
    const duration = Math.floor(Math.random() * 1000) + 10;
    const status = Math.random() > 0.1 ? 200 : [400, 404, 500][Math.floor(Math.random() * 3)];
    
    traces.push({
      traceId: generateTraceId(),
      spanId: generateSpanId(),
      operation: operation,
      duration: duration,
      status: status,
      timestamp: new Date(Date.now() - Math.random() * 300000).toISOString(), // Last 5 minutes
      tags: {
        'http.method': operation.split(' ')[0],
        'http.url': operation.split(' ')[1],
        'http.status_code': status
      }
    });
  }
  
  // Sort by timestamp descending
  traces.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  res.json({
    traces: traces,
    total: traces.length,
    timestamp: new Date().toISOString()
  });
});

// Helper functions for generating trace/span IDs
function generateTraceId() {
  return Array.from({length: 32}, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function generateSpanId() {
  return Array.from({length: 16}, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

module.exports = router;