const { register } = require('./prometheus');

/**
 * Create monitoring endpoints for an Express app
 * @param {Object} app - Express application instance
 * @param {Object} options - Configuration options
 * @param {string} options.metricsPath - Path for metrics endpoint (default: '/metrics')
 * @param {string} options.healthPath - Path for health endpoint (default: '/health')
 */
function createMonitoringEndpoints(app, options = {}) {
  const {
    metricsPath = '/metrics',
    healthPath = '/health'
  } = options;

  // Prometheus metrics endpoint
  app.get(metricsPath, async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (error) {
      console.error('Error generating metrics:', error);
      res.status(500).end(error.message);
    }
  });

  // Health check endpoint
  app.get(healthPath, (req, res) => {
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid,
      version: process.version,
      environment: process.env.NODE_ENV || 'development',
    };

    try {
      res.status(200).json(healthCheck);
    } catch (error) {
      console.error('Error in health check:', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  });

  // Readiness probe endpoint (Kubernetes-style)
  app.get('/ready', (req, res) => {
    // Add your readiness checks here (database connections, external services, etc.)
    // For now, we'll just return ready if the process is running
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  });

  // Liveness probe endpoint (Kubernetes-style)
  app.get('/live', (req, res) => {
    // Add your liveness checks here (basic functionality tests)
    // For now, we'll just return alive if the process is running
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
    });
  });
}

/**
 * Create a comprehensive monitoring info endpoint
 * @param {Object} app - Express application instance
 * @param {string} serviceName - Name of the service
 * @param {string} serviceVersion - Version of the service
 */
function createInfoEndpoint(app, serviceName = 'node-app', serviceVersion = '1.0.0') {
  app.get('/info', (req, res) => {
    const info = {
      service: {
        name: serviceName,
        version: serviceVersion,
        environment: process.env.NODE_ENV || 'development',
        namespace: process.env.OTEL_SERVICE_NAMESPACE || 'development',
      },
      runtime: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        uptime: process.uptime(),
      },
      memory: process.memoryUsage(),
      monitoring: {
        metrics: {
          endpoint: '/metrics',
          format: 'prometheus',
        },
        tracing: {
          enabled: true,
          collector: process.env.OTEL_COLLECTOR_URL || 'http://localhost:4318/v1/traces',
        },
        health: {
          endpoint: '/health',
          readiness: '/ready',
          liveness: '/live',
        },
      },
      timestamp: new Date().toISOString(),
    };

    res.json(info);
  });
}

module.exports = {
  createMonitoringEndpoints,
  createInfoEndpoint,
};