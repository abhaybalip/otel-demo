const express = require('express');
const { trace, context, SpanStatusCode } = require('@opentelemetry/api');
const { register, metrics, metricsMiddleware } = require('./metrics');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(metricsMiddleware);

// Get tracer instance
const tracer = trace.getTracer('node-otel-app', '1.0.0');

// Utility function to simulate async work
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error.message);
  }
});

// Basic health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Node.js app with OpenTelemetry monitoring',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Users endpoint with manual span creation
app.get('/users', async (req, res) => {
  const span = tracer.startSpan('get-users');
  const dbTimer = metrics.dbOperationDuration.startTimer({ operation: 'SELECT', table: 'users' });
  
  try {
    // Add attributes to the span
    span.setAttributes({
      'http.method': req.method,
      'http.url': req.url,
      'user.operation': 'fetch_users'
    });

    // Simulate database query
    const dbSpan = tracer.startSpan('database-query', {
      parent: span,
      attributes: {
        'db.operation': 'SELECT',
        'db.table': 'users'
      }
    });

    await delay(100); // Simulate DB query time
    
    dbSpan.setStatus({ code: SpanStatusCode.OK });
    dbSpan.end();
    
    // Record database metrics
    metrics.dbOperationsTotal.inc({ operation: 'SELECT', table: 'users', status: 'success' });
    dbTimer();

    const users = [
      { id: 1, name: 'Alice Johnson', email: 'alice@example.com' },
      { id: 2, name: 'Bob Smith', email: 'bob@example.com' },
      { id: 3, name: 'Charlie Brown', email: 'charlie@example.com' }
    ];

    span.setAttributes({
      'users.count': users.length
    });

    // Record user operation metrics
    metrics.userOperationsTotal.inc({ operation: 'list', status: 'success' });

    res.json({ users, count: users.length });
    span.setStatus({ code: SpanStatusCode.OK });
    
  } catch (error) {
    span.recordException(error);
    span.setStatus({ 
      code: SpanStatusCode.ERROR, 
      message: error.message 
    });
    
    // Record error metrics
    metrics.dbOperationsTotal.inc({ operation: 'SELECT', table: 'users', status: 'error' });
    metrics.userOperationsTotal.inc({ operation: 'list', status: 'error' });
    dbTimer();
    
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    span.end();
  }
});

// User by ID endpoint
app.get('/users/:id', async (req, res) => {
  const userId = req.params.id;
  const span = tracer.startSpan('get-user-by-id');
  
  try {
    span.setAttributes({
      'user.id': userId,
      'http.method': req.method,
      'http.url': req.url
    });

    // Simulate validation
    const validationSpan = tracer.startSpan('validate-user-id', { parent: span });
    
    if (!userId || isNaN(userId)) {
      validationSpan.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: 'Invalid user ID' 
      });
      validationSpan.end();
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: 'Validation failed' 
      });
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    validationSpan.setStatus({ code: SpanStatusCode.OK });
    validationSpan.end();

    // Simulate database lookup
    const dbSpan = tracer.startSpan('database-lookup', { parent: span });
    await delay(50);
    
    const user = { id: parseInt(userId), name: `User ${userId}`, email: `user${userId}@example.com` };
    
    dbSpan.setStatus({ code: SpanStatusCode.OK });
    dbSpan.end();

    res.json({ user });
    span.setStatus({ code: SpanStatusCode.OK });
    
  } catch (error) {
    span.recordException(error);
    span.setStatus({ 
      code: SpanStatusCode.ERROR, 
      message: error.message 
    });
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    span.end();
  }
});

// POST endpoint for creating users
app.post('/users', async (req, res) => {
  const span = tracer.startSpan('create-user');
  const dbTimer = metrics.dbOperationDuration.startTimer({ operation: 'INSERT', table: 'users' });
  
  try {
    const { name, email } = req.body;
    
    span.setAttributes({
      'user.name': name,
      'user.email': email,
      'http.method': req.method
    });

    // Simulate validation
    const validationSpan = tracer.startSpan('validate-user-data', { parent: span });
    
    if (!name || !email) {
      validationSpan.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: 'Missing required fields' 
      });
      validationSpan.end();
      
      // Record validation failure metrics
      metrics.userOperationsTotal.inc({ operation: 'create', status: 'validation_error' });
      dbTimer();
      
      return res.status(400).json({ error: 'Name and email are required' });
    }
    
    validationSpan.setStatus({ code: SpanStatusCode.OK });
    validationSpan.end();

    // Simulate database insert
    const dbSpan = tracer.startSpan('database-insert', { parent: span });
    await delay(150);
    
    const newUser = {
      id: Math.floor(Math.random() * 1000) + 100,
      name,
      email,
      createdAt: new Date().toISOString()
    };
    
    dbSpan.setAttributes({
      'db.operation': 'INSERT',
      'db.table': 'users',
      'user.id': newUser.id
    });
    dbSpan.setStatus({ code: SpanStatusCode.OK });
    dbSpan.end();

    // Record success metrics
    metrics.dbOperationsTotal.inc({ operation: 'INSERT', table: 'users', status: 'success' });
    metrics.userOperationsTotal.inc({ operation: 'create', status: 'success' });
    dbTimer();

    res.status(201).json({ user: newUser });
    span.setStatus({ code: SpanStatusCode.OK });
    
  } catch (error) {
    span.recordException(error);
    span.setStatus({ 
      code: SpanStatusCode.ERROR, 
      message: error.message 
    });
    
    // Record error metrics
    metrics.dbOperationsTotal.inc({ operation: 'INSERT', table: 'users', status: 'error' });
    metrics.userOperationsTotal.inc({ operation: 'create', status: 'error' });
    dbTimer();
    
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    span.end();
  }
});

// Error endpoint to demonstrate error tracking
app.get('/error', (req, res) => {
  const span = tracer.startSpan('intentional-error');
  
  try {
    // Intentionally throw an error
    throw new Error('This is an intentional error for testing OpenTelemetry');
  } catch (error) {
    span.recordException(error);
    span.setStatus({ 
      code: SpanStatusCode.ERROR, 
      message: error.message 
    });
    res.status(500).json({ 
      error: 'Something went wrong!',
      message: error.message 
    });
  } finally {
    span.end();
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 OpenTelemetry tracing enabled`);
  console.log(`\nTry these endpoints:`);
  console.log(`  GET  http://localhost:${PORT}/`);
  console.log(`  GET  http://localhost:${PORT}/health`);
  console.log(`  GET  http://localhost:${PORT}/users`);
  console.log(`  GET  http://localhost:${PORT}/users/123`);
  console.log(`  POST http://localhost:${PORT}/users`);
  console.log(`  GET  http://localhost:${PORT}/error`);
});

module.exports = app;