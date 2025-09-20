/**
 * Environment Configuration
 * 
 * Centralized configuration management for the application.
 * Uses environment variables with sensible defaults.
 */

const config = {
  // Server Configuration
  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
    host: process.env.HOST || 'localhost',
    environment: process.env.NODE_ENV || 'development'
  },

  // OpenTelemetry Configuration
  telemetry: {
    serviceName: process.env.OTEL_SERVICE_NAME || 'nodejs-opentelemetry-app',
    serviceVersion: process.env.OTEL_SERVICE_VERSION || '1.0.0',
    environment: process.env.OTEL_ENVIRONMENT || process.env.NODE_ENV || 'development',
    
    // Export Configuration
    exporters: {
      console: process.env.OTEL_EXPORTER_CONSOLE_ENABLED !== 'false',
      otlp: {
        enabled: process.env.OTEL_EXPORTER_OTLP_ENABLED === 'true',
        endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317'
      }
    },

    // Sampling Configuration
    sampling: {
      ratio: parseFloat(process.env.OTEL_SAMPLING_RATIO) || 1.0 // Sample all traces by default
    }
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'pretty'
  }
};

module.exports = config;