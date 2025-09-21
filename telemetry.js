const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

// Configure the service resource
const resource = Resource.default().merge(
  new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'node-otel-app',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'development',
  })
);

// Jaeger exporter (direct - optional)
const jaegerExporter = new JaegerExporter({
  endpoint: 'http://localhost:14268/api/traces',
});

// OTLP exporter to send traces to OpenTelemetry Collector
// Supports both local and remote collector deployment
const otlpExporter = new OTLPTraceExporter({
  url: process.env.OTEL_COLLECTOR_URL || 'http://localhost:4318/v1/traces',
  headers: process.env.OTEL_COLLECTOR_HEADERS ? JSON.parse(process.env.OTEL_COLLECTOR_HEADERS) : {},
});

// Initialize the SDK
const sdk = new NodeSDK({
  resource,
  spanProcessors: [
    // OTLP exporter to OpenTelemetry Collector (enabled)
    new (require('@opentelemetry/sdk-trace-base').BatchSpanProcessor)(otlpExporter),
    // Direct Jaeger exporter (optional - comment out if using collector)
    // new (require('@opentelemetry/sdk-trace-base').BatchSpanProcessor)(jaegerExporter),
  ],
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable specific instrumentations if needed
      '@opentelemetry/instrumentation-fs': {
        enabled: false, // Disable file system instrumentation to reduce noise
      },
    }),
  ],
});

// Start the SDK
sdk.start();

console.log('OpenTelemetry initialized successfully');

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('OpenTelemetry terminated'))
    .catch((error) => console.log('Error terminating OpenTelemetry', error))
    .finally(() => process.exit(0));
});

module.exports = sdk;