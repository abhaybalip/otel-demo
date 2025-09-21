# Node.js OpenTelemetry + Prometheus Sample Application

A comprehensive Express.js application demonstrating the integration of OpenTelemetry with Prometheus using the **pull-based model**. The OpenTelemetry Collector acts as a bridge, scraping Prometheus metrics from the application and converting them to OTLP format.

## Architecture

```
┌─────────────────┐    ┌──────────────────────┐    ┌─────────────┐
│   Node.js App   │───▶│  OTel Collector      │───▶│ Prometheus  │
│                 │    │  (Scrapes /metrics)  │    │  (Storage)  │
│ - Prometheus    │    │                      │    └─────────────┘
│   metrics       │    │ - Prometheus Receiver│
│ - OTLP traces   │────┤ - OTLP Receiver     │    ┌─────────────┐
└─────────────────┘    │ - Batch Processing   │───▶│   Jaeger    │
                       └──────────────────────┘    │  (Tracing)  │
                                                   └─────────────┘
```

## Features

- 🚀 Express.js web server
- 📊 OpenTelemetry auto-instrumentation + manual spans
- 📈 Prometheus metrics endpoint with custom business metrics
- � OpenTelemetry Collector as metrics bridge (pull-based)
- 🎯 Jaeger integration for distributed tracing
- 📉 Grafana dashboards for visualization
- ⚡ Error tracking and exception recording
- 🎯 Multiple API endpoints for testing

## Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

## Quick Start

### Option 1: Application Only (Recommended for Development)

**Windows (PowerShell):**
```powershell
.\start-demo.ps1
```

**Linux/Mac (Bash):**
```bash
./start-demo.sh
```

### Option 2: Manual Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Start optional dev services:**
```bash
COMPOSE_PROFILES=dev-tools docker-compose up -d
```

3. **Start the Node.js application:**
```bash
npm start
```

### Option 3: Production Deployment

For production monitoring with separate collector server:

1. **Deploy collector on monitoring server:**
```bash
cd otel-collector-deployment
cp .env.example .env
# Edit .env with your configuration
.\deploy.ps1
```

2. **Configure Node.js app for remote collector:**
```bash
# Create .env file in app directory
OTEL_COLLECTOR_URL=http://your-collector-server:4318/v1/traces
```

The application will start on `http://localhost:3000`

## Access Points

### Development Mode
- **Application**: http://localhost:3000
- **Prometheus Metrics**: http://localhost:3000/metrics
- **Dev Prometheus**: http://localhost:9090 (if dev-tools profile enabled)
- **Dev Jaeger**: http://localhost:16686 (if dev-tools profile enabled)

### Production Mode (with separate collector)
- **Application**: http://localhost:3000
- **Collector**: http://collector-server:8888/metrics
- **Production Prometheus**: http://prometheus-server:9090
- **Production Jaeger**: http://jaeger-server:16686

## API Endpoints

### Health Check
- **GET** `/` - Basic application info
- **GET** `/health` - Health check with uptime

### Users API
- **GET** `/users` - Get all users (with database simulation)
- **GET** `/users/:id` - Get user by ID (with validation)
- **POST** `/users` - Create new user
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com"
  }
  ```

### Metrics & Monitoring
- **GET** `/metrics` - Prometheus metrics endpoint
- **GET** `/error` - Intentional error for testing error tracking

## Available Metrics

### HTTP Metrics
- `http_requests_total{method, route, status_code}` - Total HTTP requests
- `http_request_duration_seconds{method, route, status_code}` - Request duration histogram
- `http_active_connections` - Active HTTP connections

### Database Metrics
- `db_operations_total{operation, table, status}` - Database operation counter
- `db_operation_duration_seconds{operation, table}` - Database operation duration

### Business Metrics  
- `user_operations_total{operation, status}` - User-specific operations
- `app_info{version, name, environment}` - Application information

### System Metrics (Node.js)
- `nodejs_*` - CPU, memory, event loop, garbage collection stats

## Observability Features

### Prometheus Metrics (Pull-Based)
- **Application Metrics**: Custom business metrics exposed at `/metrics`
- **Default Node.js Metrics**: CPU, memory, event loop, GC stats
- **HTTP Metrics**: Request count, duration, active connections
- **Database Metrics**: Operation count, duration, status
- **User Operation Metrics**: Business-specific counters

### OpenTelemetry Tracing
- **Auto-Instrumentation**: HTTP requests, Express routes
- **Manual Spans**: Custom business logic tracing
- **Span Attributes**: Rich metadata and context
- **Error Tracking**: Exception recording and error spans
- **Nested Spans**: Parent-child relationships

### OpenTelemetry Collector
- **Prometheus Receiver**: Scrapes metrics from `/metrics` endpoint
- **OTLP Receiver**: Receives traces from the application
- **Data Processing**: Batch processing, resource attribution
- **Multi-Export**: Sends data to Prometheus and Jaeger

## Example Usage

### 1. Start the Complete Stack

```bash
# Start monitoring infrastructure
docker-compose up -d

# Start the Node.js application
npm start
```

### 2. Generate Some Traffic

```bash
# Basic health check
curl http://localhost:3000/health

# Get all users (generates db metrics)
curl http://localhost:3000/users

# Get specific user (with validation metrics)
curl http://localhost:3000/users/123

# Create a new user (creates various metrics)
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Smith", "email": "alice@example.com"}'

# Trigger an error (error metrics)
curl http://localhost:3000/error

# View raw Prometheus metrics
curl http://localhost:3000/metrics
```

### 3. Explore the Data

**Prometheus Queries** (http://localhost:9090):
```promql
# HTTP request rate
rate(http_requests_total[5m])

# HTTP request duration 95th percentile  
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Database operation errors
rate(db_operations_total{status="error"}[5m])

# User operation success rate
rate(user_operations_total{status="success"}[5m]) / rate(user_operations_total[5m])
```

**Jaeger Traces** (http://localhost:16686):
- Search for traces by service name: `node-otel-app`
- View trace details including spans and timing
- Analyze request flow and performance

**Grafana Dashboards** (http://localhost:3001):
- Login: admin/admin
- Create dashboards using Prometheus datasource
- Visualize metrics with graphs and alerts

## Architecture Deep Dive

### Pull-Based Metrics Collection

This implementation demonstrates the **first method** of OpenTelemetry + Prometheus integration:

1. **Node.js App** exposes metrics at `/metrics` in Prometheus format
2. **OpenTelemetry Collector** scrapes these metrics using Prometheus Receiver
3. **Collector** converts metrics to OTLP format and processes them
4. **Collector** exports metrics to Prometheus via Remote Write API
5. **Prometheus** stores and serves metrics for querying
6. **Grafana** visualizes metrics from Prometheus

### Data Flow

```
App Metrics (/metrics) → Collector (Prometheus Receiver) → Collector (Processors) → Prometheus (Remote Write)
App Traces (OTLP) → Collector (OTLP Receiver) → Collector (Processors) → Jaeger
```

## Configuration Files

- `otel-collector-config.yaml` - Collector configuration
- `prometheus.yml` - Prometheus scraping configuration  
- `docker-compose.yml` - Complete monitoring stack
- `metrics.js` - Prometheus metrics definitions

### Environment Variables

You can customize the application behavior with environment variables:

```bash
# Change the port
PORT=4000 npm start

# Service name for traces
OTEL_SERVICE_NAME="my-custom-app" npm start

# Jaeger endpoint
OTEL_EXPORTER_JAEGER_ENDPOINT="http://localhost:14268/api/traces" npm start
```

## Project Structure

```
├── app.js           # Main Express application
├── telemetry.js     # OpenTelemetry configuration
├── package.json     # Dependencies and scripts
└── README.md        # This file
```

## Key OpenTelemetry Concepts

- **Traces**: Complete request journey
- **Spans**: Individual operations within a trace
- **Attributes**: Key-value metadata attached to spans
- **Events**: Timestamped messages within spans
- **Context**: Propagation of trace information across operations

## Troubleshooting

### Common Issues

1. **No traces appearing**: Check that the telemetry.js file is being loaded before your application code
2. **Module not found errors**: Run `npm install` to ensure all dependencies are installed
3. **Port conflicts**: Change the PORT environment variable if 3000 is already in use

### Debug Mode

To see more detailed OpenTelemetry logs:

```bash
export DEBUG="@opentelemetry/*"
npm start
```

## Next Steps

- Add metrics collection with OpenTelemetry Metrics API
- Integrate with cloud observability platforms (AWS X-Ray, Google Cloud Trace, etc.)
- Add custom business metrics and dashboards
- Implement distributed tracing across multiple services

## License

MIT