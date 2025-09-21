/**
 * Example: Basic Express.js application with monitoring integration
 * 
 * This example shows how to add the monitoring library to a simple Express app
 */

const express = require('express');
const monitoring = require('../lib');

const app = express();
const PORT = process.env.PORT || 3001;

// Add monitoring to the application
const { tracer, metrics } = monitoring.addMonitoring(app, {
  addEndpoints: true,        // Add /metrics and /health endpoints
  metricsPath: '/metrics',   // Customize metrics endpoint path
  healthPath: '/health'      // Customize health endpoint path
});

// Basic middleware
app.use(express.json());

// Example routes with custom tracing
app.get('/', (req, res) => {
  res.json({
    message: 'Hello from monitored Express app!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/api/hello/:name', async (req, res) => {
  const span = tracer.startSpan('hello-operation');
  
  try {
    const { name } = req.params;
    
    // Add custom attributes to the span
    span.setAttributes({
      'user.name': name,
      'operation.type': 'greeting',
    });
    
    // Simulate some async work
    await new Promise(resolve => setTimeout(resolve, 100));
    
    span.setStatus({ code: 1 }); // SUCCESS
    res.json({
      message: `Hello, ${name}!`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: 2, message: error.message }); // ERROR
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    span.end();
  }
});

// Example route with custom metrics
app.post('/api/events', (req, res) => {
  const span = tracer.startSpan('process-event');
  
  try {
    const { eventType, data } = req.body;
    
    // Increment custom business metric
    metrics.businessEventsTotal.inc({ 
      event_type: eventType || 'unknown', 
      status: 'success' 
    });
    
    span.setAttributes({
      'event.type': eventType,
      'event.data_size': JSON.stringify(data || {}).length
    });
    
    span.setStatus({ code: 1 });
    res.json({
      success: true,
      eventType,
      processedAt: new Date().toISOString()
    });
  } catch (error) {
    metrics.businessEventsTotal.inc({ 
      event_type: req.body?.eventType || 'unknown', 
      status: 'error' 
    });
    
    span.recordException(error);
    span.setStatus({ code: 2, message: error.message });
    res.status(500).json({ error: 'Failed to process event' });
  } finally {
    span.end();
  }
});

// Example route that simulates database operations
app.get('/api/users', async (req, res) => {
  const span = tracer.startSpan('get-users');
  const dbTimer = metrics.dbOperationDuration.startTimer({ 
    operation: 'SELECT', 
    table: 'users' 
  });
  
  try {
    span.setAttributes({
      'db.operation': 'SELECT',
      'db.table': 'users'
    });
    
    // Simulate database query
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const users = [
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' },
      { id: 3, name: 'Charlie', email: 'charlie@example.com' }
    ];
    
    metrics.dbOperationsTotal.inc({ 
      operation: 'SELECT', 
      table: 'users', 
      status: 'success' 
    });
    
    span.setStatus({ code: 1 });
    res.json(users);
  } catch (error) {
    metrics.dbOperationsTotal.inc({ 
      operation: 'SELECT', 
      table: 'users', 
      status: 'error' 
    });
    
    span.recordException(error);
    span.setStatus({ code: 2, message: error.message });
    res.status(500).json({ error: 'Failed to fetch users' });
  } finally {
    dbTimer(); // Stop the timer
    span.end();
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  const span = tracer.startSpan('error-handler');
  
  span.recordException(error);
  span.setAttributes({
    'error.name': error.name,
    'error.message': error.message,
    'http.method': req.method,
    'http.url': req.url
  });
  
  console.error('Unhandled error:', error);
  
  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
  
  span.end();
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`\\n🚀 Basic monitored Express app running on port ${PORT}`);
  console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
  console.log(`❤️  Health: http://localhost:${PORT}/health`);
  console.log(`\\nTry these endpoints:`);
  console.log(`  GET  http://localhost:${PORT}/`);
  console.log(`  GET  http://localhost:${PORT}/api/hello/YourName`);
  console.log(`  GET  http://localhost:${PORT}/api/users`);
  console.log(`  POST http://localhost:${PORT}/api/events`);
  console.log(`       Body: {"eventType": "user_signup", "data": {"userId": 123}}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});