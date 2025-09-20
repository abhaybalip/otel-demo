/**
 * Error Handling Middleware
 * 
 * Centralized error handling for the Express application.
 */

const config = require('../config/environment');

/**
 * Error handling middleware
 */
function errorHandler(err, req, res, next) {
  // Set default error status if not set
  const status = err.status || err.statusCode || 500;
  
  // Log error details
  console.error(`[${new Date().toISOString()}] ERROR ${req.method} ${req.url}:`, {
    error: err.message,
    stack: config.server.environment === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent')
  });

  // Prepare error response
  const errorResponse = {
    error: {
      message: status === 500 ? 'Internal Server Error' : err.message,
      status,
      timestamp: new Date().toISOString(),
      path: req.url
    }
  };

  // Include stack trace in development mode
  if (config.server.environment === 'development') {
    errorResponse.error.stack = err.stack;
  }

  // Send error response
  res.status(status).json(errorResponse);
}

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res) {
  const error = {
    message: `Route ${req.method} ${req.url} not found`,
    status: 404,
    timestamp: new Date().toISOString(),
    path: req.url
  };

  console.warn(`[${new Date().toISOString()}] WARN 404 - ${req.method} ${req.url}`);
  res.status(404).json({ error });
}

module.exports = {
  errorHandler,
  notFoundHandler
};