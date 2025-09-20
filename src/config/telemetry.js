/**
 * OpenTelemetry Instrumentation Configuration
 * 
 * This module sets up OpenTelemetry instrumentation for the application.
 * It must be imported before any other modules to ensure proper instrumentation.
 */

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const config = require('./environment');

class TelemetryService {
  constructor() {
    this.sdk = null;
    this.isInitialized = false;
  }

  /**
   * Initialize OpenTelemetry SDK
   */
  initialize() {
    if (this.isInitialized) {
      console.warn('[OpenTelemetry] SDK already initialized');
      return this.sdk;
    }

    console.log(`[OpenTelemetry] Initializing instrumentation for service: ${config.telemetry.serviceName}`);

    try {
      // Create resource with service information
      const resource = new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: config.telemetry.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: config.telemetry.serviceVersion,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.telemetry.environment,
      });

      // Configure the OpenTelemetry SDK
      this.sdk = new NodeSDK({
        resource,
        instrumentations: [
          getNodeAutoInstrumentations({
            // Disable file system instrumentation to reduce noise
            '@opentelemetry/instrumentation-fs': {
              enabled: false,
            },
            // Configure HTTP instrumentation
            '@opentelemetry/instrumentation-http': {
              enabled: true,
              requestHook: (span, request) => {
                span.setAttributes({
                  'http.request.header.user-agent': request.getHeader('user-agent'),
                });
              },
            },
            // Configure Express instrumentation
            '@opentelemetry/instrumentation-express': {
              enabled: true,
            },
          }),
        ],
      });

      // Start the SDK
      this.sdk.start();
      this.isInitialized = true;
      
      console.log('[OpenTelemetry] SDK initialized successfully');
      
      // Set up graceful shutdown handlers
      this._setupShutdownHandlers();
      
      return this.sdk;

    } catch (error) {
      console.error('[OpenTelemetry] Failed to initialize:', error.message);
      console.error('[OpenTelemetry] Stack trace:', error.stack);
      console.error('[OpenTelemetry] Application will continue without tracing');
      return null;
    }
  }

  /**
   * Set up graceful shutdown handlers
   * @private
   */
  _setupShutdownHandlers() {
    const shutdown = async (signal) => {
      console.log(`[OpenTelemetry] Received ${signal}, shutting down gracefully...`);
      
      try {
        if (this.sdk) {
          await this.sdk.shutdown();
          console.log('[OpenTelemetry] Shutdown completed successfully');
        }
        process.exit(0);
      } catch (error) {
        console.error('[OpenTelemetry] Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Handle different shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon
  }

  /**
   * Get the SDK instance
   */
  getSDK() {
    return this.sdk;
  }

  /**
   * Check if telemetry is initialized
   */
  isReady() {
    return this.isInitialized;
  }
}

// Create singleton instance
const telemetryService = new TelemetryService();

// Initialize immediately
telemetryService.initialize();

module.exports = telemetryService;