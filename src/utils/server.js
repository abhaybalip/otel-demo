/**
 * Server Utilities
 * 
 * Utility functions for server management and helpers.
 */

const config = require('../config/environment');

/**
 * Graceful shutdown handler
 */
class GracefulShutdown {
  constructor(server) {
    this.server = server;
    this.isShuttingDown = false;
  }

  /**
   * Set up shutdown handlers
   */
  setupHandlers() {
    const shutdown = async (signal) => {
      if (this.isShuttingDown) {
        console.log(`[Server] Already shutting down, ignoring ${signal}`);
        return;
      }

      this.isShuttingDown = true;
      console.log(`[Server] Received ${signal}, starting graceful shutdown...`);

      // Stop accepting new requests
      this.server.close(async (err) => {
        if (err) {
          console.error('[Server] Error during server close:', err);
          process.exit(1);
        }

        console.log('[Server] HTTP server closed');
        
        try {
          // Add any cleanup tasks here
          await this.cleanup();
          console.log('[Server] Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          console.error('[Server] Error during cleanup:', error);
          process.exit(1);
        }
      });

      // Force exit after timeout
      setTimeout(() => {
        console.error('[Server] Shutdown timeout, forcing exit');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon
  }

  /**
   * Cleanup function for additional shutdown tasks
   */
  async cleanup() {
    // Add any cleanup logic here (database connections, etc.)
    console.log('[Server] Running cleanup tasks...');
    
    // Example: Close database connections
    // await database.close();
    
    console.log('[Server] Cleanup completed');
  }
}

/**
 * Get server information
 */
function getServerInfo() {
  return {
    name: config.telemetry.serviceName,
    version: config.telemetry.serviceVersion,
    environment: config.server.environment,
    node_version: process.version,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };
}

/**
 * Format server startup message
 */
function formatStartupMessage(port, host = 'localhost') {
  const info = getServerInfo();
  
  return `
╭─────────────────────────────────────────────────────────────╮
│                   Server Started Successfully               │
├─────────────────────────────────────────────────────────────┤
│  Service: ${info.name}${' '.repeat(Math.max(0, 38 - info.name.length))}  │
│  Version: ${info.version}${' '.repeat(Math.max(0, 38 - info.version.length))}  │
│  Environment: ${info.environment}${' '.repeat(Math.max(0, 34 - info.environment.length))}  │
│  URL: http://${host}:${port}${' '.repeat(Math.max(0, 30 - host.length - port.toString().length))}  │
│  Process ID: ${info.pid}${' '.repeat(Math.max(0, 33 - info.pid.toString().length))}  │
│  Node Version: ${info.node_version}${' '.repeat(Math.max(0, 31 - info.node_version.length))}  │
├─────────────────────────────────────────────────────────────┤
│  Available Routes:                                          │
│    GET /               - Welcome message                    │
│    GET /health         - Basic health check                 │
│    GET /health/detailed - Detailed health information       │
│    GET /slow           - Slow response demo                 │
│    GET /error          - Error testing endpoint             │
│    ALL /echo           - Request echo endpoint              │
╰─────────────────────────────────────────────────────────────╯
  `.trim();
}

module.exports = {
  GracefulShutdown,
  getServerInfo,
  formatStartupMessage
};