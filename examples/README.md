# Examples Directory

This directory contains practical examples showing how to integrate the monitoring library into different types of Node.js applications.

## Examples

### 1. Basic Express Integration (`basic-express.js`)

A simple example showing how to add monitoring to a new Express.js application.

**Features demonstrated:**
- Basic monitoring setup with `addMonitoring()`
- Custom span creation and tracing
- Business metrics integration
- Error handling with monitoring
- Database operation simulation

**To run:**
```bash
node examples/basic-express.js
```

**Test endpoints:**
- `GET /` - Basic health check
- `GET /api/hello/:name` - Custom tracing example
- `GET /api/users` - Database operation simulation
- `POST /api/events` - Business events tracking
- `GET /metrics` - Prometheus metrics
- `GET /health` - Health check

### 2. Advanced Express Integration (`advanced-express.js`)

A comprehensive example showing advanced monitoring features for production applications.

**Features demonstrated:**
- Custom telemetry initialization
- Complex nested spans (parent-child relationships)
- Custom business metrics creation
- Session tracking
- Advanced analytics endpoints
- Graceful shutdown handling

**To run:**
```bash
node examples/advanced-express.js
```

**Test endpoints:**
- `POST /api/orders` - Complex order creation with nested spans
- `PATCH /api/orders/:orderId/status` - Order status updates
- `GET /api/analytics/orders` - Analytics with complex queries
- `DELETE /api/sessions/:sessionId` - Session management
- `GET /info` - Service information endpoint

### 3. Existing Application Integration (`existing-app-integration.js`)

Shows how to add monitoring to an existing Express.js application with minimal code changes.

**Features demonstrated:**
- Non-intrusive monitoring integration
- Wrapping existing route handlers
- Adding monitoring to legacy code
- Session tracking for existing apps
- Error tracking enhancement

**To run:**
```bash
node examples/existing-app-integration.js
```

**Test endpoints:**
- Original endpoints (unchanged):
  - `GET /api/products`
  - `POST /api/products`
- Enhanced endpoints (with monitoring):
  - `GET /api/products/enhanced`
  - `GET /api/users`
  - `POST /api/orders`

## Configuration

All examples can be configured using environment variables:

```bash
# Service configuration
export OTEL_SERVICE_NAME="my-service"
export OTEL_SERVICE_VERSION="1.0.0"
export OTEL_SERVICE_NAMESPACE="production"

# OpenTelemetry Collector
export OTEL_COLLECTOR_URL="http://localhost:4318/v1/traces"
export OTEL_COLLECTOR_HEADERS='{"authorization":"Bearer token"}'

# Jaeger (optional)
export ENABLE_JAEGER="true"
export JAEGER_ENDPOINT="http://localhost:14268/api/traces"

# Application
export PORT="3000"
export NODE_ENV="production"
```

## Testing the Examples

### Using curl

```bash
# Basic health check
curl http://localhost:3001/

# Create an order (advanced example)
curl -X POST http://localhost:3002/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "123",
    "customerType": "premium",
    "items": [
      {
        "id": 1,
        "name": "Laptop",
        "price": 999.99,
        "quantity": 1,
        "category": "electronics"
      }
    ]
  }'

# Check metrics
curl http://localhost:3001/metrics

# Check health
curl http://localhost:3001/health
```

### Using session tracking

```bash
# Send requests with session tracking
curl -H "x-session-id: user123" http://localhost:3003/api/users
curl -H "x-session-id: user456" http://localhost:3003/api/products
```

## Monitoring Infrastructure

To see the full monitoring in action, you'll need:

1. **OpenTelemetry Collector** (see `../otel-collector-deployment/`)
2. **Prometheus** (for metrics storage)
3. **Jaeger** (for trace visualization)
4. **Grafana** (for dashboards)

## Best Practices Demonstrated

1. **Span Hierarchy**: Advanced example shows proper parent-child span relationships
2. **Error Handling**: All examples include proper error recording and status setting
3. **Business Metrics**: Custom metrics for business-specific operations
4. **Performance Monitoring**: Database operation timing and request duration tracking
5. **Resource Management**: Proper span cleanup and graceful shutdown
6. **Configuration**: Environment-based configuration for different environments

## Next Steps

After running these examples:

1. Check the metrics at `/metrics` endpoint
2. Set up the full observability stack using the collector deployment
3. Create custom dashboards in Grafana
4. Set up alerting based on your metrics
5. Adapt the patterns to your specific application needs