/**
 * Example: Existing application integration
 * 
 * This shows how to add monitoring to an existing Express.js application
 * with minimal changes to existing code
 */

const express = require('express');

// Existing application setup (before monitoring)
const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

// === EXISTING ROUTES (unchanged) ===

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to my existing app!' });
});

app.get('/api/products', async (req, res) => {
  // Simulate existing business logic
  await new Promise(resolve => setTimeout(resolve, 100));
  
  res.json([
    { id: 1, name: 'Laptop', price: 999.99 },
    { id: 2, name: 'Phone', price: 599.99 }
  ]);
});

app.post('/api/products', async (req, res) => {
  // Simulate existing business logic
  const { name, price } = req.body;
  
  await new Promise(resolve => setTimeout(resolve, 150));
  
  const product = {
    id: Date.now(),
    name,
    price,
    createdAt: new Date().toISOString()
  };
  
  res.status(201).json(product);
});

// === ADD MONITORING TO EXISTING APP ===

const monitoring = require('../lib');

// Initialize monitoring (this should be done early, ideally at the top of the file)
monitoring.initializeTelemetry({
  serviceName: 'existing-express-app',
  serviceVersion: '1.5.0',
  serviceNamespace: 'production'
});

// Add monitoring middleware (add this after express.json() but before routes)
app.use(monitoring.metricsMiddleware);

// Add monitoring endpoints
monitoring.addMonitoring(app, {
  addEndpoints: true,
  metricsPath: '/metrics',
  healthPath: '/health'
});

// Get tracer for adding custom spans to existing routes
const tracer = monitoring.getTracer('existing-express-app', '1.5.0');

// === ENHANCE EXISTING ROUTES WITH MONITORING ===

// Option 1: Minimal enhancement - wrap existing route handlers
const originalProductsGet = app._router.stack.find(layer => 
  layer.route && layer.route.path === '/api/products' && layer.route.methods.get
);

if (originalProductsGet) {
  // Enhance existing route with tracing
  app.get('/api/products/enhanced', async (req, res) => {
    const span = tracer.startSpan('get-products-enhanced');
    
    try {
      span.setAttributes({
        'operation.type': 'product_fetch',
        'product.category': req.query.category || 'all'
      });
      
      // Call existing business logic
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const products = [
        { id: 1, name: 'Laptop', price: 999.99 },
        { id: 2, name: 'Phone', price: 599.99 }
      ];
      
      // Record business metrics
      monitoring.metrics.businessEventsTotal.inc({ 
        event_type: 'products_fetched', 
        status: 'success' 
      });
      
      span.setStatus({ code: 1 });
      res.json(products);
      
    } catch (error) {
      monitoring.metrics.businessEventsTotal.inc({ 
        event_type: 'products_fetched', 
        status: 'error' 
      });
      
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      res.status(500).json({ error: 'Failed to fetch products' });
    } finally {
      span.end();
    }
  });
}

// Option 2: Create a monitoring wrapper for existing functions
function withMonitoring(operationName, handler) {
  return async (req, res, next) => {
    const span = tracer.startSpan(operationName);
    
    try {
      span.setAttributes({
        'http.method': req.method,
        'http.url': req.url,
        'http.user_agent': req.get('User-Agent') || 'unknown'
      });
      
      await handler(req, res, next);
      
      span.setStatus({ code: 1 });
      
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    } finally {
      span.end();
    }
  };
}

// Use the wrapper for new routes
app.get('/api/users', withMonitoring('get-users', async (req, res) => {
  // Simulate database operation
  const dbTimer = monitoring.metrics.dbOperationDuration.startTimer({ 
    operation: 'SELECT', 
    table: 'users' 
  });
  
  try {
    await new Promise(resolve => setTimeout(resolve, 120));
    
    const users = [
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' }
    ];
    
    monitoring.metrics.dbOperationsTotal.inc({ 
      operation: 'SELECT', 
      table: 'users', 
      status: 'success' 
    });
    
    res.json(users);
    
  } finally {
    dbTimer();
  }
}));

// Add custom monitoring for business-specific operations
app.post('/api/orders', withMonitoring('create-order', async (req, res) => {
  const { customerId, items } = req.body;
  
  // Create a timer for the entire order creation process
  const orderTimer = monitoring.createTimer(
    monitoring.metrics.businessEventsTotal,
    { event_type: 'order_creation', status: 'in_progress' }
  );
  
  try {
    // Simulate order validation
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Simulate order processing
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const order = {
      id: Date.now(),
      customerId,
      items,
      status: 'created',
      createdAt: new Date().toISOString()
    };
    
    // Record successful order creation
    monitoring.metrics.businessEventsTotal.inc({ 
      event_type: 'order_created', 
      status: 'success' 
    });
    
    res.status(201).json(order);
    
  } catch (error) {
    monitoring.metrics.businessEventsTotal.inc({ 
      event_type: 'order_created', 
      status: 'error' 
    });
    throw error;
  } finally {
    orderTimer();
  }
}));

// Add middleware to track user sessions (existing apps often need this)
const activeSessions = new Set();

app.use((req, res, next) => {
  const sessionId = req.headers['x-session-id'];
  
  if (sessionId) {
    activeSessions.add(sessionId);
    monitoring.metrics.currentUsers.set({ user_type: 'authenticated' }, activeSessions.size);
    
    // Clean up session on response end
    res.on('close', () => {
      if (activeSessions.has(sessionId)) {
        activeSessions.delete(sessionId);
        monitoring.metrics.currentUsers.set({ user_type: 'authenticated' }, activeSessions.size);
      }
    });
  }
  
  next();
});

// Add error tracking to existing error handler
app.use((error, req, res, next) => {
  const span = tracer.startSpan('error-handler');
  
  span.recordException(error);
  span.setAttributes({
    'error.type': error.constructor.name,
    'error.message': error.message,
    'http.method': req.method,
    'http.url': req.url,
    'http.status_code': res.statusCode
  });
  
  // Record error metrics
  monitoring.metrics.businessEventsTotal.inc({ 
    event_type: 'unhandled_error', 
    status: 'error' 
  });
  
  console.error('Unhandled error:', error);
  
  if (!res.headersSent) {
    res.status(500).json({ 
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
  
  span.end();
});

// Start server
app.listen(PORT, () => {
  console.log(`\\n🚀 Existing app with monitoring running on port ${PORT}`);
  console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
  console.log(`❤️  Health: http://localhost:${PORT}/health`);
  console.log(`\\nExisting endpoints (unchanged):`);
  console.log(`  GET  http://localhost:${PORT}/`);
  console.log(`  GET  http://localhost:${PORT}/api/products`);
  console.log(`  POST http://localhost:${PORT}/api/products`);
  console.log(`\\nEnhanced endpoints (with monitoring):`);
  console.log(`  GET  http://localhost:${PORT}/api/products/enhanced`);
  console.log(`  GET  http://localhost:${PORT}/api/users`);
  console.log(`  POST http://localhost:${PORT}/api/orders`);
  console.log(`\\nTip: Add 'x-session-id' header to requests to track sessions`);
});

// Graceful shutdown with monitoring cleanup
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  try {
    // Optional: shutdown telemetry gracefully
    await monitoring.shutdownTelemetry();
    console.log('Monitoring shutdown complete');
  } catch (error) {
    console.error('Error during monitoring shutdown:', error);
  }
  
  process.exit(0);
});