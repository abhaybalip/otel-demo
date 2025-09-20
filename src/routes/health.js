/**
 * Health Check Routes
 * 
 * Provides health and status endpoints for monitoring.
 */

const express = require('express');
const router = express.Router();
const config = require('../config/environment');
const telemetryService = require('../config/telemetry');

/**
 * Basic health check endpoint
 */
router.get('/', (req, res) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: {
      name: config.telemetry.serviceName,
      version: config.telemetry.serviceVersion,
      environment: config.server.environment
    },
    telemetry: {
      initialized: telemetryService.isReady()
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    node_version: process.version
  };

  res.json(healthStatus);
});

/**
 * Detailed health check with dependencies
 */
router.get('/detailed', (req, res) => {
  const detailedHealth = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: {
      name: config.telemetry.serviceName,
      version: config.telemetry.serviceVersion,
      environment: config.server.environment,
      uptime: process.uptime(),
      pid: process.pid
    },
    system: {
      platform: process.platform,
      arch: process.arch,
      node_version: process.version,
      memory: process.memoryUsage(),
      cpu_usage: process.cpuUsage()
    },
    telemetry: {
      initialized: telemetryService.isReady(),
      service_name: config.telemetry.serviceName
    }
  };

  res.json(detailedHealth);
});

module.exports = router;