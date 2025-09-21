# Integration Guide: Node.js OpenTelemetry + Prometheus Module

This guide explains how to integrate the OpenTelemetry and Prometheus monitoring functionality from this module into your existing Node.js application.

## Table of Contents

1. [Quick Integration](#quick-integration)
2. [Modular Integration](#modular-integration)
3. [Configuration Options](#configuration-options)
4. [Example Implementation](#example-implementation)
5. [Troubleshooting](#troubleshooting)

## Quick Integration

### Step 1: Install Dependencies

Add the required dependencies to your existing Node.js project:

```bash
npm install @opentelemetry/api @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-jaeger @opentelemetry/exporter-trace-otlp-http @opentelemetry/sdk-node @opentelemetry/sdk-trace-base @opentelemetry/semantic-conventions express prom-client
```

### Step 2: Copy Core Files

Copy these files from this module to your project:

- `telemetry.js` - OpenTelemetry configuration
- `metrics.js` - Prometheus metrics setup

### Step 3: Update Your Application Startup

Modify your application's main entry point to initialize telemetry:

```javascript
// In your main app file (e.g., index.js, server.js, app.js)
// IMPORTANT: This must be the FIRST require in your application
require('./telemetry');

// Your existing application code
const express = require('express');
const { register, metrics, metricsMiddleware } = require('./metrics');

const app = express();

// Add metrics middleware early in your middleware stack
app.use(metricsMiddleware);

// Add metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error.message);
  }
});

// Your existing routes and middleware
```

### Step 4: Update Package.json Scripts

Update your start script to include telemetry initialization:

```json
{
  "scripts": {
    "start": "node -r ./telemetry.js your-app.js",
    "dev": "nodemon -r ./telemetry.js your-app.js"
  }
}
```

## Modular Integration

For better organization, you can create a separate monitoring module:

### Step 1: Create Monitoring Module Structure

```
your-project/
├── monitoring/
│   ├── index.js
│   ├── telemetry.js
│   ├── metrics.js
│   └── README.md
├── your-app.js
└── package.json
```

### Step 2: Create Monitoring Index File

Create `monitoring/index.js`:

```javascript
// monitoring/index.js
const { register, metrics, metricsMiddleware } = require('./metrics');
const { trace } = require('@opentelemetry/api');

// Initialize telemetry (this will auto-execute)
require('./telemetry');

module.exports = {
  // Prometheus exports
  register,
  metrics,
  metricsMiddleware,
  
  // OpenTelemetry exports
  getTracer: (name, version) => trace.getTracer(name, version),
  
  // Convenience function to add metrics endpoint
  addMetricsEndpoint: (app) => {
    app.get('/metrics', async (req, res) => {
      try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
      } catch (error) {
        res.status(500).end(error.message);
      }
    });
  }
};
```

### Step 3: Use in Your Application

```javascript
// your-app.js
const express = require('express');
const monitoring = require('./monitoring');

const app = express();

// Add monitoring middleware
app.use(monitoring.metricsMiddleware);

// Add metrics endpoint
monitoring.addMetricsEndpoint(app);

// Get tracer for custom spans
const tracer = monitoring.getTracer('your-app-name', '1.0.0');

// Your existing application code
app.get('/api/users', async (req, res) => {
  // Create custom spans
  const span = tracer.startSpan('get-users-operation');
  
  try {
    // Your business logic here
    const users = await getUsersFromDatabase();
    
    span.setStatus({ code: 1 }); // SUCCESS
    res.json(users);
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: 2, message: error.message }); // ERROR
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    span.end();
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Configuration Options

### Environment Variables

Configure the monitoring behavior using these environment variables:

```bash
# OpenTelemetry Collector URL (default: http://localhost:4318/v1/traces)
OTEL_COLLECTOR_URL=http://your-collector:4318/v1/traces

# Additional headers for OTLP exporter (JSON format)
OTEL_COLLECTOR_HEADERS='{"authorization":"Bearer your-token"}'

# Service configuration
OTEL_SERVICE_NAME=your-service-name
OTEL_SERVICE_VERSION=1.0.0
OTEL_SERVICE_NAMESPACE=production

# Jaeger endpoint (if using direct Jaeger export)
JAEGER_ENDPOINT=http://localhost:14268/api/traces
```

### Customizing Telemetry Configuration

You can customize the telemetry setup by modifying `telemetry.js`:

```javascript
// telemetry.js - Custom configuration example
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

const resource = Resource.default().merge(
  new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'your-app',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION || '1.0.0',
    [SemanticResourceAttributes.SERVICE_NAMESPACE]: process.env.OTEL_SERVICE_NAMESPACE || 'development',
    // Add custom attributes
    'deployment.environment': process.env.NODE_ENV || 'development',
    'service.instance.id': require('os').hostname(),
  })
);

// Custom instrumentations
const sdk = new NodeSDK({
  resource,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable noisy instrumentations
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
      
      // Configure HTTP instrumentation
      '@opentelemetry/instrumentation-http': {
        ignoreIncomingRequestHook: (req) => {
          // Ignore health checks and metrics endpoints
          return req.url === '/health' || req.url === '/metrics';
        },
      },
    }),
  ],
});

sdk.start();
```

### Adding Custom Metrics

You can extend the metrics by modifying `metrics.js` or creating additional metric files:

```javascript
// In your application code
const { metrics } = require('./monitoring');

// Use existing metrics
metrics.httpRequestsTotal.inc({ method: 'GET', route: '/api/users', status_code: '200' });

// Add custom metrics
const client = require('prom-client');
const customCounter = new client.Counter({
  name: 'business_events_total',
  help: 'Total number of business events',
  labelNames: ['event_type', 'user_id'],
  registers: [metrics.register], // Use the same registry
});

customCounter.inc({ event_type: 'user_login', user_id: '123' });
```

## Example Implementation

Here's a complete example of integrating this monitoring into an existing Express.js API:

```javascript
// server.js
const express = require('express');
const monitoring = require('./monitoring');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(monitoring.metricsMiddleware);

// Add monitoring endpoints
monitoring.addMetricsEndpoint(app);
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Get tracer for custom instrumentation
const tracer = monitoring.getTracer('my-api', '1.0.0');

// Example API endpoint with custom tracing
app.get('/api/products', async (req, res) => {
  const span = tracer.startSpan('fetch-products');
  const dbTimer = monitoring.metrics.dbOperationDuration.startTimer({ 
    operation: 'SELECT', 
    table: 'products' 
  });

  try {
    span.setAttributes({
      'http.method': req.method,
      'http.url': req.url,
      'user.id': req.headers['x-user-id'] || 'anonymous',
    });

    // Simulate database operation
    await new Promise(resolve => setTimeout(resolve, 100));
    const products = [
      { id: 1, name: 'Product 1', price: 29.99 },
      { id: 2, name: 'Product 2', price: 39.99 },
    ];

    // Record successful operation
    monitoring.metrics.dbOperationsTotal.inc({ 
      operation: 'SELECT', 
      table: 'products', 
      status: 'success' 
    });

    span.setStatus({ code: 1 });
    res.json(products);
  } catch (error) {
    // Record failed operation
    monitoring.metrics.dbOperationsTotal.inc({ 
      operation: 'SELECT', 
      table: 'products', 
      status: 'error' 
    });

    span.recordException(error);
    span.setStatus({ code: 2, message: error.message });
    res.status(500).json({ error: 'Failed to fetch products' });
  } finally {
    dbTimer();
    span.end();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Metrics available at http://localhost:${PORT}/metrics`);
  console.log(`Health check at http://localhost:${PORT}/health`);
});
```

## Troubleshooting

### Common Issues

1. **Telemetry not initializing**: Ensure `require('./telemetry')` is the FIRST require in your application
2. **Metrics endpoint returns empty**: Check that metrics are being incremented and the register is properly configured
3. **Traces not appearing**: Verify the OTLP collector URL and that the collector is running
4. **High memory usage**: Consider disabling noisy instrumentations like file system or DNS

### Debugging

Enable debug logging:

```bash
# Enable OpenTelemetry debug logs
DEBUG=@opentelemetry/* node your-app.js

# Or set environment variable
export DEBUG=@opentelemetry/*
```

### Performance Considerations

- Use sampling for high-traffic applications
- Consider disabling certain auto-instrumentations
- Monitor the overhead of custom spans and metrics

## Next Steps

1. Set up the OpenTelemetry Collector (see `otel-collector-deployment/`)
2. Configure Prometheus to scrape the collector
3. Set up Grafana dashboards for visualization
4. Configure alerting based on your metrics

For more details on the full observability stack, see the main README.md and the collector deployment guide.