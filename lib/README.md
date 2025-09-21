# Node.js Monitoring Library

A reusable monitoring library that provides OpenTelemetry tracing and Prometheus metrics for Node.js applications.

## Features

- 🚀 **Easy Integration**: Add monitoring to any Express.js app with one function call
- 📊 **OpenTelemetry Tracing**: Automatic and manual instrumentation with distributed tracing
- 📈 **Prometheus Metrics**: Built-in HTTP metrics plus custom business metrics
- 🔧 **Configurable**: Environment variables and programmatic configuration
- 🏥 **Health Endpoints**: Built-in health check and metrics endpoints
- 🔒 **Security**: Sensitive data filtering and secure collector communication
- ⚡ **Performance**: Optimized for production with sampling and batching options

## Quick Start

### 1. Install Dependencies

```bash
npm install @opentelemetry/api @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-jaeger @opentelemetry/exporter-trace-otlp-http @opentelemetry/sdk-node @opentelemetry/sdk-trace-base @opentelemetry/semantic-conventions express prom-client
```

### 2. Add to Your Express App

```javascript
const express = require('express');
const monitoring = require('./lib');

const app = express();

// Add monitoring - that's it!
const { tracer, metrics } = monitoring.addMonitoring(app);

// Your existing routes work unchanged
app.get('/api/users', async (req, res) => {
  // Optional: Add custom tracing
  const span = tracer.startSpan('get-users');
  
  try {
    // Your business logic here
    const users = await getUsersFromDatabase();
    
    span.setStatus({ code: 1 });
    res.json(users);
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: 2, message: error.message });
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    span.end();
  }
});

app.listen(3000, () => {
  console.log('Server running with monitoring at http://localhost:3000');
  console.log('Metrics: http://localhost:3000/metrics');
  console.log('Health: http://localhost:3000/health');
});
```

### 3. Configure (Optional)

```bash
# Set environment variables
export OTEL_SERVICE_NAME="my-app"
export OTEL_SERVICE_VERSION="1.0.0"
export OTEL_COLLECTOR_URL="http://localhost:4318/v1/traces"
```

## What You Get

### Automatic Metrics

- **HTTP Requests**: `http_requests_total`, `http_request_duration_seconds`
- **System Metrics**: `nodejs_process_cpu_user_seconds_total`, `nodejs_heap_size_bytes`, etc.
- **Business Metrics**: `db_operations_total`, `business_events_total`

### Automatic Tracing

- **HTTP Requests**: Automatic spans for all incoming/outgoing HTTP requests
- **Database Calls**: Automatic instrumentation for popular databases
- **Custom Spans**: Easy manual span creation for business logic

### Built-in Endpoints

- `GET /metrics` - Prometheus metrics endpoint
- `GET /health` - Application health check
- `GET /info` - Service information (optional)

## Library Structure

```
lib/
├── index.js           # Main entry point
├── telemetry.js       # OpenTelemetry configuration
├── prometheus.js      # Prometheus metrics setup
└── endpoints.js       # Health and metrics endpoints
```

## Integration Patterns

### Pattern 1: Minimal Integration

```javascript
const monitoring = require('./lib');

// One line integration
monitoring.addMonitoring(app);
```

### Pattern 2: Custom Configuration

```javascript
const monitoring = require('./lib');

// Initialize with custom settings
monitoring.initializeTelemetry({
  serviceName: 'my-custom-service',
  serviceVersion: '2.0.0',
  collectorUrl: 'https://my-collector.com/v1/traces'
});

// Add monitoring with custom endpoints
const { tracer, metrics } = monitoring.addMonitoring(app, {
  metricsPath: '/prometheus',
  healthPath: '/healthz'
});
```

### Pattern 3: Custom Metrics

```javascript
const monitoring = require('./lib');
const customMetrics = monitoring.createCustomMetrics();

// Create business-specific metrics
const orderMetrics = {
  ordersCreated: new customMetrics.Counter({
    name: 'orders_created_total',
    help: 'Total orders created',
    labelNames: ['customer_type']
  })
};

// Use in your routes
app.post('/orders', (req, res) => {
  // Business logic...
  orderMetrics.ordersCreated.inc({ customer_type: 'premium' });
  res.json({ success: true });
});
```

## Examples

See the `examples/` directory for complete integration examples:

- **Basic Express**: Simple integration example
- **Advanced Express**: Production-ready example with custom metrics
- **Existing App**: How to add monitoring to existing applications

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OTEL_SERVICE_NAME` | Service name | `node-app` |
| `OTEL_SERVICE_VERSION` | Service version | `1.0.0` |
| `OTEL_COLLECTOR_URL` | Collector endpoint | `http://localhost:4318/v1/traces` |

See [CONFIGURATION.md](CONFIGURATION.md) for complete configuration options.

## Integration Guide

For detailed integration instructions, see [INTEGRATION.md](INTEGRATION.md).

## Monitoring Infrastructure

This library works with:

- **OpenTelemetry Collector**: Receives and processes traces
- **Prometheus**: Scrapes and stores metrics
- **Jaeger**: Visualizes distributed traces
- **Grafana**: Creates dashboards and alerts

See the `otel-collector-deployment/` directory for setting up the full monitoring stack.

## API Reference

### Main Functions

#### `addMonitoring(app, options)`

Adds monitoring to an Express application.

**Parameters:**
- `app` - Express application instance
- `options` - Configuration options
  - `addEndpoints` - Add /metrics and /health endpoints (default: true)
  - `metricsPath` - Metrics endpoint path (default: '/metrics')
  - `healthPath` - Health endpoint path (default: '/health')

**Returns:** `{ tracer, metrics, register }`

#### `initializeTelemetry(options)`

Initialize OpenTelemetry with custom configuration.

**Parameters:**
- `options` - Telemetry configuration options
  - `serviceName` - Service name
  - `serviceVersion` - Service version
  - `collectorUrl` - OTLP collector URL
  - `instrumentationConfig` - Custom instrumentation settings

#### `createTracer(name, version)`

Create a custom tracer instance.

**Parameters:**
- `name` - Tracer name
- `version` - Tracer version

**Returns:** OpenTelemetry tracer instance

#### `createCustomMetrics()`

Get access to Prometheus client for creating custom metrics.

**Returns:** Object with Counter, Gauge, Histogram, Summary classes

### Metrics

The library provides several built-in metrics:

- `httpRequestsTotal` - Counter for HTTP requests
- `httpRequestDuration` - Histogram for request duration
- `dbOperationsTotal` - Counter for database operations
- `dbOperationDuration` - Histogram for database operation duration
- `businessEventsTotal` - Counter for business events
- `currentUsers` - Gauge for active users

## Best Practices

1. **Initialize Early**: Call `initializeTelemetry()` or `addMonitoring()` early in your application
2. **Use Environment Variables**: Configure for different environments using env vars
3. **Custom Spans**: Add spans for important business operations
4. **Error Handling**: Always record exceptions and set span status
5. **Cleanup**: End spans in finally blocks
6. **Sampling**: Use sampling in high-traffic applications
7. **Security**: Filter sensitive data from traces

## Performance

The library is optimized for production use:

- **Lazy Initialization**: Only initializes when needed
- **Batch Processing**: Exports spans and metrics in batches
- **Configurable Sampling**: Reduce overhead in high-traffic apps
- **Selective Instrumentation**: Disable noisy instrumentations

## Troubleshooting

### Common Issues

1. **Traces not appearing**: Check collector URL and network connectivity
2. **High memory usage**: Enable sampling and disable noisy instrumentations  
3. **Metrics not updating**: Verify middleware is installed correctly

### Debug Mode

```bash
DEBUG=@opentelemetry/* node app.js
```

See [CONFIGURATION.md](CONFIGURATION.md) for detailed troubleshooting.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests and examples
5. Submit a pull request

## License

MIT License - see LICENSE file for details.