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

  const server = app.listen(port, () => {
    console.log(formatStartupMessage(port, host));
  });

  // Set up graceful shutdown
  const gracefulShutdown = new GracefulShutdown(server);
  gracefulShutdown.setupHandlers();

  return server;
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