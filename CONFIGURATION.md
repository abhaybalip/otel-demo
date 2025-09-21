# Configuration Guide

This document provides comprehensive information about configuring the Node.js monitoring module for different environments and use cases.

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Programmatic Configuration](#programmatic-configuration)
3. [Production Recommendations](#production-recommendations)
4. [Performance Tuning](#performance-tuning)
5. [Security Configuration](#security-configuration)
6. [Troubleshooting](#troubleshooting)

## Environment Variables

### OpenTelemetry Service Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `OTEL_SERVICE_NAME` | Name of your service | `node-app` | `my-api-service` |
| `OTEL_SERVICE_VERSION` | Version of your service | `1.0.0` | `2.1.3` |
| `OTEL_SERVICE_NAMESPACE` | Service namespace/environment | `development` | `production` |

```bash
export OTEL_SERVICE_NAME="user-api"
export OTEL_SERVICE_VERSION="1.2.0"
export OTEL_SERVICE_NAMESPACE="production"
```

### OpenTelemetry Collector Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `OTEL_COLLECTOR_URL` | OTLP collector endpoint | `http://localhost:4318/v1/traces` | `https://otel-collector.company.com/v1/traces` |
| `OTEL_COLLECTOR_HEADERS` | Additional headers (JSON) | `{}` | `'{"authorization":"Bearer token123"}'` |

```bash
export OTEL_COLLECTOR_URL="https://otel-collector.company.com/v1/traces"
export OTEL_COLLECTOR_HEADERS='{"authorization":"Bearer eyJ...", "x-api-key":"key123"}'
```

### Jaeger Configuration (Optional)

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `ENABLE_JAEGER` | Enable direct Jaeger export | `false` | `true` |
| `JAEGER_ENDPOINT` | Jaeger collector endpoint | `http://localhost:14268/api/traces` | `http://jaeger:14268/api/traces` |

```bash
export ENABLE_JAEGER="true"
export JAEGER_ENDPOINT="http://jaeger.monitoring.svc.cluster.local:14268/api/traces"
```

### Application Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `PORT` | Application port | `3000` | `8080` |
| `NODE_ENV` | Node.js environment | `development` | `production` |

### Debug Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `DEBUG` | Debug output pattern | (none) | `@opentelemetry/*` |

```bash
# Enable all OpenTelemetry debug logs
export DEBUG="@opentelemetry/*"

# Enable specific debug logs
export DEBUG="@opentelemetry/instrumentation-http,@opentelemetry/sdk-node"
```

## Programmatic Configuration

### Basic Initialization

```javascript
const monitoring = require('./lib');

// Initialize with default settings
monitoring.initializeTelemetry();

// Add monitoring to Express app
const { tracer, metrics } = monitoring.addMonitoring(app);
```

### Custom Telemetry Configuration

```javascript
monitoring.initializeTelemetry({
  serviceName: 'my-custom-service',
  serviceVersion: '2.0.0',
  serviceNamespace: 'production',
  collectorUrl: 'https://otel-collector.company.com/v1/traces',
  collectorHeaders: {
    'authorization': 'Bearer ' + process.env.AUTH_TOKEN,
    'x-tenant-id': process.env.TENANT_ID
  },
  enableJaeger: false,
  instrumentationConfig: {
    '@opentelemetry/instrumentation-http': {
      ignoreIncomingRequestHook: (req) => {
        // Ignore admin endpoints
        return req.url.startsWith('/admin');
      },
      ignoreOutgoingRequestHook: (options) => {
        // Ignore internal service calls
        return options.hostname === 'internal-service';
      }
    },
    '@opentelemetry/instrumentation-fs': {
      enabled: false // Disable file system tracing
    }
  }
});
```

### Advanced Monitoring Setup

```javascript
const monitoring = require('./lib');

// Custom monitoring configuration
const { tracer, metrics } = monitoring.addMonitoring(app, {
  addEndpoints: true,
  metricsPath: '/prometheus/metrics',
  healthPath: '/health/check'
});

// Create custom metrics
const customMetrics = monitoring.createCustomMetrics();

const businessMetrics = {
  userActions: new customMetrics.Counter({
    name: 'user_actions_total',
    help: 'Total user actions',
    labelNames: ['action_type', 'user_type']
  }),
  
  systemLoad: new customMetrics.Gauge({
    name: 'system_load_current',
    help: 'Current system load',
    labelNames: ['load_type']
  }),
  
  requestLatency: new customMetrics.Histogram({
    name: 'request_latency_seconds',
    help: 'Request latency in seconds',
    labelNames: ['endpoint', 'method'],
    buckets: [0.001, 0.01, 0.1, 1, 10]
  })
};
```

## Production Recommendations

### 1. Resource Limits

```javascript
// Limit span batch size for high-traffic applications
monitoring.initializeTelemetry({
  // ... other config
  spanProcessorConfig: {
    maxQueueSize: 2048,
    maxExportBatchSize: 512,
    scheduledDelayMillis: 5000
  }
});
```

### 2. Sampling Configuration

```javascript
// Use sampling for high-volume applications
const { TraceIdRatioBasedSampler } = require('@opentelemetry/sdk-trace-base');

monitoring.initializeTelemetry({
  // ... other config
  samplerConfig: {
    sampler: new TraceIdRatioBasedSampler(0.1) // Sample 10% of traces
  }
});
```

### 3. Security Headers

```bash
# Use secure headers for collector communication
export OTEL_COLLECTOR_HEADERS='{
  "authorization": "Bearer eyJhbGciOiJIUzI1NiIs...",
  "x-api-key": "your-api-key",
  "x-tenant-id": "your-tenant"
}'
```

### 4. TLS Configuration

```javascript
// Configure TLS for secure communication
monitoring.initializeTelemetry({
  collectorUrl: 'https://secure-collector.company.com/v1/traces',
  collectorHeaders: {
    'authorization': 'Bearer ' + process.env.OTEL_TOKEN
  },
  // Additional TLS options if needed
  tlsConfig: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca.crt'),
    cert: fs.readFileSync('/path/to/client.crt'),
    key: fs.readFileSync('/path/to/client.key')
  }
});
```

## Performance Tuning

### 1. Disable Noisy Instrumentations

```javascript
monitoring.initializeTelemetry({
  instrumentationConfig: {
    // Disable file system instrumentation
    '@opentelemetry/instrumentation-fs': {
      enabled: false
    },
    
    // Disable DNS instrumentation
    '@opentelemetry/instrumentation-dns': {
      enabled: false
    },
    
    // Configure HTTP instrumentation
    '@opentelemetry/instrumentation-http': {
      ignoreIncomingRequestHook: (req) => {
        // Ignore health checks, metrics, static assets
        return req.url.match(/\/(health|metrics|favicon\.ico|\.js|\.css|\.png|\.jpg)$/);
      },
      
      ignoreOutgoingRequestHook: (options) => {
        // Ignore monitoring infrastructure calls
        return options.hostname === 'prometheus' || 
               options.hostname === 'jaeger' ||
               options.hostname === 'grafana';
      }
    }
  }
});
```

### 2. Optimize Metrics Collection

```javascript
// Reduce metrics collection frequency for default metrics
const client = require('prom-client');

client.collectDefaultMetrics({
  register: monitoring.register,
  prefix: 'nodejs_',
  timeout: 10000, // Collect every 10 seconds instead of default 5
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // Fewer GC buckets
  eventLoopMonitoringPrecision: 10 // Less precise event loop monitoring
});
```

### 3. Batch Processing Configuration

```javascript
// Configure batch processing for better performance
monitoring.initializeTelemetry({
  spanProcessorConfig: {
    // Process spans in larger batches
    maxExportBatchSize: 512,
    maxQueueSize: 4096,
    
    // Less frequent exports
    scheduledDelayMillis: 10000,
    exportTimeoutMillis: 30000
  }
});
```

## Security Configuration

### 1. Sensitive Data Filtering

```javascript
// Filter sensitive data from spans
monitoring.initializeTelemetry({
  instrumentationConfig: {
    '@opentelemetry/instrumentation-http': {
      requestHook: (span, request) => {
        // Remove sensitive headers
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
        sensitiveHeaders.forEach(header => {
          span.setAttributes({
            [`http.request.header.${header}`]: '[REDACTED]'
          });
        });
      },
      
      responseHook: (span, response) => {
        // Don't log response bodies
        span.setAttributes({
          'http.response.body': '[FILTERED]'
        });
      }
    }
  }
});
```

### 2. Custom Attribute Filtering

```javascript
// Create a custom span processor to filter sensitive data
const { SpanProcessor } = require('@opentelemetry/sdk-trace-base');

class SensitiveDataFilter extends SpanProcessor {
  onStart(span, parentContext) {
    // Filter sensitive attributes on span start
  }
  
  onEnd(span) {
    // Filter sensitive data before span export
    const attributes = span.attributes;
    Object.keys(attributes).forEach(key => {
      if (key.includes('password') || key.includes('secret') || key.includes('token')) {
        span.setAttributes({ [key]: '[REDACTED]' });
      }
    });
  }
  
  shutdown() {
    return Promise.resolve();
  }
  
  forceFlush() {
    return Promise.resolve();
  }
}

// Add the filter to your telemetry configuration
monitoring.initializeTelemetry({
  // ... other config
  customSpanProcessors: [new SensitiveDataFilter()]
});
```

## Environment-Specific Configurations

### Development Environment

```bash
# .env.development
OTEL_SERVICE_NAME=my-app-dev
OTEL_SERVICE_VERSION=dev
OTEL_SERVICE_NAMESPACE=development
OTEL_COLLECTOR_URL=http://localhost:4318/v1/traces
ENABLE_JAEGER=true
JAEGER_ENDPOINT=http://localhost:14268/api/traces
DEBUG=@opentelemetry/instrumentation-http
```

### Staging Environment

```bash
# .env.staging
OTEL_SERVICE_NAME=my-app
OTEL_SERVICE_VERSION=1.2.0-staging
OTEL_SERVICE_NAMESPACE=staging
OTEL_COLLECTOR_URL=https://otel-collector-staging.company.com/v1/traces
OTEL_COLLECTOR_HEADERS={"authorization":"Bearer staging-token"}
ENABLE_JAEGER=false
```

### Production Environment

```bash
# .env.production
OTEL_SERVICE_NAME=my-app
OTEL_SERVICE_VERSION=1.2.0
OTEL_SERVICE_NAMESPACE=production
OTEL_COLLECTOR_URL=https://otel-collector.company.com/v1/traces
OTEL_COLLECTOR_HEADERS={"authorization":"Bearer prod-token","x-tenant-id":"main"}
ENABLE_JAEGER=false
NODE_ENV=production
```

## Troubleshooting

### 1. Enable Debug Logging

```bash
# Enable all OpenTelemetry debug logs
DEBUG=@opentelemetry/* node app.js

# Enable specific debug logs
DEBUG=@opentelemetry/instrumentation-http,@opentelemetry/exporter-trace-otlp-http node app.js
```

### 2. Check Telemetry Initialization

```javascript
const monitoring = require('./lib');

// Check if telemetry is initialized
if (!monitoring.isInitialized()) {
  console.error('Telemetry not initialized!');
  monitoring.initializeTelemetry();
}
```

### 3. Validate Metrics

```javascript
// Test metrics endpoint
app.get('/test-metrics', async (req, res) => {
  try {
    const metrics = await monitoring.register.metrics();
    res.set('Content-Type', monitoring.register.contentType);
    res.send(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 4. Test Trace Export

```javascript
// Create a test span to verify tracing
app.get('/test-trace', (req, res) => {
  const tracer = monitoring.getTracer('test', '1.0.0');
  const span = tracer.startSpan('test-operation');
  
  span.setAttributes({
    'test.attribute': 'test-value',
    'test.timestamp': Date.now()
  });
  
  setTimeout(() => {
    span.setStatus({ code: 1 });
    span.end();
    res.json({ message: 'Test span created' });
  }, 100);
});
```

### 5. Common Issues

#### Spans Not Appearing in Jaeger

1. Check collector URL and connectivity
2. Verify authentication headers
3. Check collector logs for errors
4. Ensure spans are being exported (enable debug logs)

#### High Memory Usage

1. Reduce span batch size
2. Disable noisy instrumentations
3. Implement sampling
4. Check for span leaks (spans not being ended)

#### Metrics Not Updating

1. Verify metrics middleware is installed
2. Check metrics are being incremented in code
3. Verify metrics endpoint is accessible
4. Check for metric registration errors

### 6. Health Check for Monitoring

```javascript
// Add monitoring health check
app.get('/monitoring-health', (req, res) => {
  const health = {
    telemetry: {
      initialized: monitoring.isInitialized(),
      service_name: process.env.OTEL_SERVICE_NAME,
      collector_url: process.env.OTEL_COLLECTOR_URL
    },
    metrics: {
      registry_count: monitoring.register.getMetricsAsArray().length,
      default_metrics: monitoring.register.getMetricsAsArray()
        .filter(m => m.name.startsWith('nodejs_')).length
    },
    timestamp: new Date().toISOString()
  };
  
  res.json(health);
});
```

## Best Practices Summary

1. **Use environment variables** for different deployment environments
2. **Filter sensitive data** from traces and metrics
3. **Implement sampling** for high-traffic applications
4. **Disable noisy instrumentations** to reduce overhead
5. **Use TLS** for production collector communication
6. **Monitor the monitoring** - track telemetry health
7. **Test configurations** in staging before production
8. **Document your configuration** for your team