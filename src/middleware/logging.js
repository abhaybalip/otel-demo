/**
 * Request Logging Middleware
 * 
 * Logs incoming HTTP requests with timestamps and basic information.
 */

const config = require('../config/environment');

/**
 * Create request logging middleware
 */
function createRequestLogger() {
  return (req, res, next) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.url;
    const userAgent = req.get('User-Agent') || 'Unknown';
    const ip = req.ip || req.connection.remoteAddress || 'Unknown';

    // Log request details
    console.log(`[${timestamp}] ${method} ${url} - IP: ${ip}`);
    
    // Add request start time for duration calculation
    req.startTime = Date.now();

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - req.startTime;
      const statusCode = res.statusCode;
      const statusClass = Math.floor(statusCode / 100);
      
      const logLevel = statusClass >= 4 ? 'ERROR' : statusClass >= 3 ? 'WARN' : 'INFO';
      console.log(`[${new Date().toISOString()}] ${logLevel} ${method} ${url} - ${statusCode} - ${duration}ms`);
    });

    next();
  };
}

module.exports = {
  createRequestLogger
};