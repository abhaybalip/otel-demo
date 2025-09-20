/**
 * OpenTelemetry Instrumentation Setup
 * 
 * This file configures OpenTelemetry for tracing HTTP requests in a Node.js application.
 * It must be imported before any other modules to ensure proper instrumentation.
 */

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

// Configuration
const SERVICE_NAME = 'nodejs-opentelemetry-app';

console.log(`[OpenTelemetry] Initializing instrumentation for service: ${SERVICE_NAME}`);

try {
  // Configure the OpenTelemetry SDK
  const sdk = new NodeSDK({
    serviceName: SERVICE_NAME,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  // Start the SDK
  sdk.start();
  console.log('[OpenTelemetry] SDK initialized successfully');

  // Graceful shutdown handlers
  const shutdown = (signal) => {
    console.log(`[OpenTelemetry] Received ${signal}, shutting down gracefully...`);
    sdk.shutdown()
      .then(() => {
        console.log('[OpenTelemetry] Shutdown completed');
        process.exit(0);
      })
      .catch((error) => {
        console.error('[OpenTelemetry] Error during shutdown:', error);
        process.exit(1);
      });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Export SDK for potential use in other modules
  module.exports = { sdk };

} catch (error) {
  console.error('[OpenTelemetry] Failed to initialize:', error.message);
  console.error('[OpenTelemetry] Application will continue without tracing');
}
