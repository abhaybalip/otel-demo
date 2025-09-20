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

module.exports = router;