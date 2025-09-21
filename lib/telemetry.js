const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { trace } = require('@opentelemetry/api');

let sdk = null;
let isInitialized = false;

/**
 * Initialize OpenTelemetry SDK
 * @param {Object} options - Configuration options
 * @param {string} options.serviceName - Service name
 * @param {string} options.serviceVersion - Service version
 * @param {string} options.serviceNamespace - Service namespace
 * @param {string} options.collectorUrl - OTLP collector URL
 * @param {Object} options.collectorHeaders - Additional headers for collector
 * @param {boolean} options.enableJaeger - Enable direct Jaeger export
 * @param {string} options.jaegerEndpoint - Jaeger endpoint URL
 * @param {Object} options.instrumentationConfig - Custom instrumentation configuration
 */
function initializeTelemetry(options = {}) {
  if (isInitialized) {
    console.warn('OpenTelemetry already initialized');
    return sdk;
  }

  const {
    serviceName = process.env.OTEL_SERVICE_NAME || 'node-app',
    serviceVersion = process.env.OTEL_SERVICE_VERSION || '1.0.0',
    serviceNamespace = process.env.OTEL_SERVICE_NAMESPACE || 'development',
    collectorUrl = process.env.OTEL_COLLECTOR_URL || 'http://localhost:4318/v1/traces',
    collectorHeaders = process.env.OTEL_COLLECTOR_HEADERS ? JSON.parse(process.env.OTEL_COLLECTOR_HEADERS) : {},
    enableJaeger = process.env.ENABLE_JAEGER === 'true',
    jaegerEndpoint = process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
    instrumentationConfig = {}
  } = options;

  // Configure the service resource
  const resource = Resource.default().merge(
    new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
      [SemanticResourceAttributes.SERVICE_NAMESPACE]: serviceNamespace,
      'deployment.environment': process.env.NODE_ENV || 'development',
      'service.instance.id': require('os').hostname(),
    })
  );

  const spanProcessors = [];

  // OTLP exporter to OpenTelemetry Collector
  const otlpExporter = new OTLPTraceExporter({
    url: collectorUrl,
    headers: collectorHeaders,
  });
  spanProcessors.push(new BatchSpanProcessor(otlpExporter));

  // Optional direct Jaeger exporter
  if (enableJaeger) {
    const jaegerExporter = new JaegerExporter({
      endpoint: jaegerEndpoint,
    });
    spanProcessors.push(new BatchSpanProcessor(jaegerExporter));
  }

  // Default instrumentation configuration
  const defaultInstrumentationConfig = {
    '@opentelemetry/instrumentation-fs': {
      enabled: false, // Disable file system instrumentation to reduce noise
    },
    '@opentelemetry/instrumentation-dns': {
      enabled: false, // Disable DNS instrumentation to reduce noise
    },
    '@opentelemetry/instrumentation-http': {
      ignoreIncomingRequestHook: (req) => {
        // Ignore health checks and metrics endpoints
        return req.url === '/health' || req.url === '/metrics' || req.url === '/favicon.ico';
      },
      ignoreOutgoingRequestHook: (options) => {
        // Ignore requests to monitoring infrastructure
        return options.hostname === 'localhost' && 
               (options.port === 9090 || options.port === 3000); // Prometheus, Jaeger
      },
    },
    ...instrumentationConfig
  };

  // Initialize the SDK
  sdk = new NodeSDK({
    resource,
    spanProcessors,
    instrumentations: [
      getNodeAutoInstrumentations(defaultInstrumentationConfig),
    ],
  });

  // Start the SDK
  try {
    sdk.start();
    isInitialized = true;
    console.log('OpenTelemetry initialized successfully');
  } catch (error) {
    console.error('Failed to initialize OpenTelemetry:', error);
    throw error;
  }

  return sdk;
}

/**
 * Get a tracer instance
 * @param {string} name - Tracer name (default: service name from resource)
 * @param {string} version - Tracer version
 * @returns {Object} OpenTelemetry tracer
 */
function getTracer(name, version = '1.0.0') {
  if (!isInitialized) {
    console.warn('OpenTelemetry not initialized, initializing with defaults');
    initializeTelemetry();
  }
  
  const tracerName = name || process.env.OTEL_SERVICE_NAME || 'node-app';
  return trace.getTracer(tracerName, version);
}

/**
 * Shutdown telemetry (useful for graceful shutdown)
 * @returns {Promise} Promise that resolves when shutdown is complete
 */
async function shutdownTelemetry() {
  if (sdk && isInitialized) {
    try {
      await sdk.shutdown();
      isInitialized = false;
      console.log('OpenTelemetry shutdown successfully');
    } catch (error) {
      console.error('Error during OpenTelemetry shutdown:', error);
      throw error;
    }
  }
}

/**
 * Check if telemetry is initialized
 * @returns {boolean} True if initialized
 */
function isInitializedTelemetry() {
  return isInitialized;
}

module.exports = {
  initializeTelemetry,
  getTracer,
  shutdownTelemetry,
  isInitialized: isInitializedTelemetry,
};