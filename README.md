# OpenTelemetry Demo (otel-demo)

A well-organized Node.js Express application demonstrating OpenTelemetry tracing, observability best practices, and clean architecture.

## � **Documentation**

- � **[PROJECT-OVERVIEW.md](./PROJECT-OVERVIEW.md)** - Detailed explanation of what each file does and how they work together
- � **This README** - Quick start guide and usage instructions

## Overview

This project showcases how to integrate OpenTelemetry into a Node.js Express application using modern development practices, including:

- ✅ Modular architecture with separation of concerns
- ✅ OpenTelemetry instrumentation with automatic tracing
- ✅ Environment-based configuration
- ✅ Comprehensive error handling and logging
- ✅ Health check endpoints
- ✅ Graceful shutdown handling
- ✅ Development and production-ready setup

## Project Structure

```
opentelemetry-nodejs-example/
├── src/                          # Source code
│   ├── config/                   # Configuration modules
│   │   ├── environment.js        # Environment variables and config
│   │   └── telemetry.js         # OpenTelemetry setup
│   ├── middleware/               # Express middleware
│   │   ├── errorHandler.js      # Error handling middleware
│   │   └── logging.js           # Request logging middleware
│   ├── routes/                   # Route handlers
│   │   ├── api.js               # Main API routes
│   │   └── health.js            # Health check routes
│   └── utils/                    # Utility functions
│       └── server.js            # Server utilities and graceful shutdown
├── server.js                     # Main application entry point
├── app.js                        # Simple alternative entry point
├── instrumentation.js            # Basic OpenTelemetry setup
├── package.json                  # Dependencies and scripts
└── README.md                    # This file
```

## Features

### 🔍 **Observability**
- Automatic HTTP request/response tracing
- Express.js route tracing
- Custom span attributes and metadata
- Comprehensive error tracking
- Performance monitoring

### 🏗️ **Architecture**
- Modular design with clear separation of concerns
- Environment-based configuration
- Centralized error handling
- Structured logging
- Graceful shutdown handling

### 🛠️ **Developer Experience**
- Hot reload with nodemon
- Environment variable support
- Comprehensive health checks
- Detailed startup information
- Development and production modes

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)

### Installation

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

This project has **two different entry points** you can choose from:

#### 🚀 **Option 1: Full Featured Application (Recommended)**
Uses the modular structure with `server.js`:

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm start
```

#### 🎓 **Option 2: Simple Learning Example**
Uses the basic `app.js` for learning:

```bash
# Run the simple version
node app.js
```

**Note**: Fix the import in `app.js` first by changing line 8:
```javascript
// Change from:
require('instrumentation');
// To:
require('./instrumentation');
```

The server will start on `http://localhost:3000` by default.

### 📊 **Entry Points Comparison**

| Feature | `server.js` (Recommended) | `app.js` (Simple) |
|---------|---------------------------|-------------------|
| **Best for** | Production, learning architecture | Quick start, basic concepts |
| **Structure** | Modular, organized folders | Single file |
| **Configuration** | Environment-based | Hardcoded |
| **Error Handling** | Comprehensive middleware | Basic try-catch |
| **Health Checks** | Multiple endpoints | Single endpoint |
| **Logging** | Structured logging | Simple console.log |
| **Shutdown** | Graceful shutdown | Basic process exit |
| **OpenTelemetry** | Advanced setup | Basic setup |

## Available Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/` | GET | Welcome message with service info |
| `/health` | GET | Basic health check |
| `/health/detailed` | GET | Detailed health information |
| `/slow` | GET | Slow response demo (supports `?delay=ms`) |
| `/error` | GET | Error testing (supports `?type=error_type`) |
| `/echo` | ALL | Request echo endpoint |

### Route Examples

```bash
# Basic endpoints
curl http://localhost:3000
curl http://localhost:3000/health

# Test slow response with custom delay
curl "http://localhost:3000/slow?delay=1000"

# Test error handling
curl "http://localhost:3000/error?type=validation"
curl "http://localhost:3000/error?type=auth"

# Echo request data
curl -X POST http://localhost:3000/echo \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## Configuration

The application uses environment variables for configuration. Copy `.env.example` to `.env` and customize:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# OpenTelemetry Configuration
OTEL_SERVICE_NAME=nodejs-opentelemetry-app
OTEL_SERVICE_VERSION=1.0.0
OTEL_ENVIRONMENT=development

# Tracing Configuration
OTEL_EXPORTER_CONSOLE_ENABLED=true
OTEL_SAMPLING_RATIO=1.0
```

## Understanding the Code

### Telemetry Setup (`src/config/telemetry.js`)

The telemetry configuration automatically instruments HTTP requests and Express routes:

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  serviceName: 'nodejs-opentelemetry-app',
  instrumentations: [getNodeAutoInstrumentations()],
});
```

### Application Structure (`server.js`)

The main application follows Express.js best practices:

```javascript
// Initialize telemetry first
require('./src/config/telemetry');

const app = express();

// Middleware
app.use(createRequestLogger());

// Routes
app.use('/health', healthRoutes);
app.use('/', apiRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);
```

### Environment Configuration (`src/config/environment.js`)

Centralized configuration management with defaults:

```javascript
const config = {
  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
    environment: process.env.NODE_ENV || 'development'
  },
  telemetry: {
    serviceName: process.env.OTEL_SERVICE_NAME || 'nodejs-opentelemetry-app'
  }
};
```

## Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with hot reload
- `npm run dev:env` - Start with custom environment file
- `npm run check:health` - Test health endpoint
- `npm run check:detailed` - Test detailed health endpoint

### Adding New Routes

1. Create route handler in `src/routes/`
2. Import and mount in `server.js`
3. Add documentation to README

### Adding Middleware

1. Create middleware in `src/middleware/`
2. Export as a function
3. Apply in `server.js`

## Testing Tracing

1. Start the application:
   ```bash
   npm run dev
   ```

2. Make requests to see traces in console output:
   ```bash
   curl http://localhost:3000
   curl http://localhost:3000/slow
   curl http://localhost:3000/health/detailed
   ```

3. Check console for OpenTelemetry trace information

## Production Deployment

### Environment Variables

Set these environment variables for production:

```bash
NODE_ENV=production
PORT=3000
OTEL_SERVICE_NAME=your-service-name
OTEL_SERVICE_VERSION=1.0.0
OTEL_ENVIRONMENT=production
```

### Health Checks

Use the health endpoints for monitoring:

- `GET /health` - Basic health check
- `GET /health/detailed` - Comprehensive health information

## Troubleshooting

### Common Issues

1. **Port already in use**: Change `PORT` in `.env` file
2. **Module not found**: Run `npm install`
3. **Permission denied**: Check file permissions and execution policy

### Debug Mode

Enable detailed logging by setting:
```bash
LOG_LEVEL=debug
NODE_ENV=development
```

## Contributing

1. Follow the existing code structure
2. Add appropriate error handling
3. Update documentation
4. Test all endpoints

## License

ISC

The main Express application that imports instrumentation first:

```javascript
// IMPORTANT: Load OpenTelemetry instrumentation first
require('./instrumentation');

const express = require('express');
// ... rest of the application
```

## Dependencies

- **express**: Web framework for Node.js
- **@opentelemetry/sdk-node**: OpenTelemetry Node.js SDK
- **@opentelemetry/sdk-trace-node**: Trace SDK with console exporter

## Development

### Scripts

- `npm start` - Start the application
- `npm run dev` - Start in development mode (same as start)

### Adding Custom Tracing

To add custom spans to your code:

```javascript
const { trace } = require('@opentelemetry/api');

const tracer = trace.getTracer('my-service');

app.get('/custom', async (req, res) => {
  const span = tracer.startSpan('custom-operation');
  
  try {
    // Your business logic here
    span.addEvent('Processing request');
    
    res.json({ message: 'Custom traced operation' });
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;
  } finally {
    span.end();
  }
});
```

## Troubleshooting

### Common Issues

1. **No traces appearing**: Ensure `instrumentation.js` is imported before Express
2. **Module not found errors**: Run `npm install` to install dependencies
3. **Port already in use**: Change the PORT environment variable or modify the port in `app.js`

### Debug Mode

The application includes detailed logging. Check console output for:
- `[OpenTelemetry]` - Instrumentation logs
- `[App]` - Application logs
- Request logs with timestamps

## Next Steps

To extend this example:

1. **Add different exporters**: OTLP, Jaeger, Zipkin
2. **Include metrics**: Add OpenTelemetry metrics collection
3. **Add auto-instrumentations**: Include database and HTTP client tracing
4. **Custom instrumentation**: Add business logic tracing
5. **Sampling**: Configure trace sampling strategies

## License

ISC