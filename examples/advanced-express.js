/**
 * Example: Advanced Express.js application with custom monitoring
 * 
 * This example shows advanced monitoring features including:
 * - Custom metrics creation
 * - Manual telemetry initialization
 * - Advanced tracing with parent-child spans
 * - Business-specific monitoring
 */

const express = require('express');
const monitoring = require('../lib');

const app = express();
const PORT = process.env.PORT || 3002;

// Initialize telemetry with custom configuration
monitoring.initializeTelemetry({
  serviceName: 'advanced-express-app',
  serviceVersion: '2.0.0',
  serviceNamespace: 'production',
  enableJaeger: true, // Enable direct Jaeger export
  instrumentationConfig: {
    '@opentelemetry/instrumentation-http': {
      ignoreIncomingRequestHook: (req) => {
        // Ignore admin and internal endpoints
        return req.url.startsWith('/admin') || req.url.startsWith('/internal');
      },
    },
  }
});

// Create custom tracer and metrics
const tracer = monitoring.createTracer('advanced-express-app', '2.0.0');
const customMetrics = monitoring.createCustomMetrics();

// Create custom business metrics
const orderMetrics = {
  ordersCreated: new customMetrics.Counter({
    name: 'orders_created_total',
    help: 'Total number of orders created',
    labelNames: ['customer_type', 'product_category'],
    registers: [customMetrics.register]
  }),
  
  orderValue: new customMetrics.Histogram({
    name: 'order_value_dollars',
    help: 'Order value in dollars',
    labelNames: ['customer_type'],
    buckets: [10, 50, 100, 500, 1000, 5000],
    registers: [customMetrics.register]
  }),
  
  activeOrders: new customMetrics.Gauge({
    name: 'active_orders_count',
    help: 'Number of currently active orders',
    labelNames: ['status'],
    registers: [customMetrics.register]
  })
};

// Add monitoring with custom configuration
const { metrics } = monitoring.addMonitoring(app, {
  addEndpoints: true,
  metricsPath: '/metrics',
  healthPath: '/health'
});

// Add info endpoint
monitoring.createMonitoringEndpoints(app);
const { createInfoEndpoint } = require('../lib/endpoints');
createInfoEndpoint(app, 'advanced-express-app', '2.0.0');

// Middleware
app.use(express.json());

// Simulate user session tracking
const activeSessions = new Map();

app.use((req, res, next) => {
  const sessionId = req.headers['x-session-id'];
  if (sessionId) {
    activeSessions.set(sessionId, {
      startTime: Date.now(),
      lastActivity: Date.now(),
      requests: (activeSessions.get(sessionId)?.requests || 0) + 1
    });
    
    // Update current users metric
    metrics.currentUsers.set({ user_type: 'authenticated' }, activeSessions.size);
  }
  next();
});

// Complex business operation with nested spans
app.post('/api/orders', async (req, res) => {
  const parentSpan = tracer.startSpan('create-order');
  
  try {
    const { customerId, items, customerType = 'regular' } = req.body;
    
    parentSpan.setAttributes({
      'order.customer_id': customerId,
      'order.items_count': items?.length || 0,
      'order.customer_type': customerType
    });
    
    // Validation span
    const validationSpan = tracer.startSpan('validate-order', { parent: parentSpan });
    try {
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate validation
      validationSpan.setStatus({ code: 1 });
    } catch (error) {
      validationSpan.recordException(error);
      validationSpan.setStatus({ code: 2, message: error.message });
      throw error;
    } finally {
      validationSpan.end();
    }
    
    // Calculate order value
    const orderValue = items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
    
    // Inventory check span
    const inventorySpan = tracer.startSpan('check-inventory', { parent: parentSpan });
    const inventoryTimer = metrics.dbOperationDuration.startTimer({ 
      operation: 'SELECT', 
      table: 'inventory' 
    });
    
    try {
      inventorySpan.setAttributes({
        'inventory.items_to_check': items?.length || 0
      });
      
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate inventory check
      
      metrics.dbOperationsTotal.inc({ 
        operation: 'SELECT', 
        table: 'inventory', 
        status: 'success' 
      });
      
      inventorySpan.setStatus({ code: 1 });
    } catch (error) {
      metrics.dbOperationsTotal.inc({ 
        operation: 'SELECT', 
        table: 'inventory', 
        status: 'error' 
      });
      
      inventorySpan.recordException(error);
      inventorySpan.setStatus({ code: 2, message: error.message });
      throw error;
    } finally {
      inventoryTimer();
      inventorySpan.end();
    }
    
    // Order creation span
    const createSpan = tracer.startSpan('save-order', { parent: parentSpan });
    const createTimer = metrics.dbOperationDuration.startTimer({ 
      operation: 'INSERT', 
      table: 'orders' 
    });
    
    try {
      createSpan.setAttributes({
        'db.operation': 'INSERT',
        'db.table': 'orders',
        'order.value': orderValue
      });
      
      await new Promise(resolve => setTimeout(resolve, 80)); // Simulate database save
      
      // Record business metrics
      const productCategory = items?.[0]?.category || 'unknown';
      orderMetrics.ordersCreated.inc({ customer_type: customerType, product_category: productCategory });
      orderMetrics.orderValue.observe({ customer_type: customerType }, orderValue);
      orderMetrics.activeOrders.inc({ status: 'pending' });
      
      metrics.dbOperationsTotal.inc({ 
        operation: 'INSERT', 
        table: 'orders', 
        status: 'success' 
      });
      
      metrics.businessEventsTotal.inc({ 
        event_type: 'order_created', 
        status: 'success' 
      });
      
      createSpan.setStatus({ code: 1 });
      
      const orderId = Math.random().toString(36).substring(7);
      
      parentSpan.setAttributes({
        'order.id': orderId,
        'order.value': orderValue,
        'order.status': 'created'
      });
      
      parentSpan.setStatus({ code: 1 });
      
      res.status(201).json({
        orderId,
        customerId,
        items,
        orderValue,
        status: 'created',
        createdAt: new Date().toISOString()
      });
      
    } catch (error) {
      metrics.dbOperationsTotal.inc({ 
        operation: 'INSERT', 
        table: 'orders', 
        status: 'error' 
      });
      
      metrics.businessEventsTotal.inc({ 
        event_type: 'order_created', 
        status: 'error' 
      });
      
      createSpan.recordException(error);
      createSpan.setStatus({ code: 2, message: error.message });
      throw error;
    } finally {
      createTimer();
      createSpan.end();
    }
    
  } catch (error) {
    parentSpan.recordException(error);
    parentSpan.setStatus({ code: 2, message: error.message });
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    parentSpan.end();
  }
});

// Order status update endpoint
app.patch('/api/orders/:orderId/status', async (req, res) => {
  const span = tracer.startSpan('update-order-status');
  
  try {
    const { orderId } = req.params;
    const { status, previousStatus } = req.body;
    
    span.setAttributes({
      'order.id': orderId,
      'order.new_status': status,
      'order.previous_status': previousStatus
    });
    
    // Simulate database update
    await new Promise(resolve => setTimeout(resolve, 60));
    
    // Update active orders gauge
    if (previousStatus) {
      orderMetrics.activeOrders.dec({ status: previousStatus });
    }
    orderMetrics.activeOrders.inc({ status });
    
    metrics.businessEventsTotal.inc({ 
      event_type: 'order_status_updated', 
      status: 'success' 
    });
    
    span.setStatus({ code: 1 });
    res.json({
      orderId,
      status,
      updatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    metrics.businessEventsTotal.inc({ 
      event_type: 'order_status_updated', 
      status: 'error' 
    });
    
    span.recordException(error);
    span.setStatus({ code: 2, message: error.message });
    res.status(500).json({ error: 'Failed to update order status' });
  } finally {
    span.end();
  }
});

// Analytics endpoint with complex queries
app.get('/api/analytics/orders', async (req, res) => {
  const span = tracer.startSpan('analytics-orders');
  
  try {
    const { timeRange = '24h', customerType } = req.query;
    
    span.setAttributes({
      'analytics.time_range': timeRange,
      'analytics.customer_type': customerType || 'all'
    });
    
    // Simulate complex analytics query
    const querySpan = tracer.startSpan('analytics-query', { parent: span });
    const queryTimer = metrics.dbOperationDuration.startTimer({ 
      operation: 'SELECT', 
      table: 'orders_analytics' 
    });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 200)); // Simulate heavy query
      
      metrics.dbOperationsTotal.inc({ 
        operation: 'SELECT', 
        table: 'orders_analytics', 
        status: 'success' 
      });
      
      querySpan.setStatus({ code: 1 });
    } finally {
      queryTimer();
      querySpan.end();
    }
    
    const analytics = {
      timeRange,
      totalOrders: Math.floor(Math.random() * 1000),
      totalRevenue: Math.floor(Math.random() * 50000),
      averageOrderValue: Math.floor(Math.random() * 200) + 50,
      topProducts: [
        { id: 1, name: 'Product A', orders: Math.floor(Math.random() * 100) },
        { id: 2, name: 'Product B', orders: Math.floor(Math.random() * 100) },
      ]
    };
    
    span.setStatus({ code: 1 });
    res.json(analytics);
    
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: 2, message: error.message });
    res.status(500).json({ error: 'Failed to fetch analytics' });
  } finally {
    span.end();
  }
});

// Session cleanup endpoint
app.delete('/api/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  if (activeSessions.has(sessionId)) {
    activeSessions.delete(sessionId);
    metrics.currentUsers.set({ user_type: 'authenticated' }, activeSessions.size);
  }
  
  res.status(204).send();
});

// Start server
app.listen(PORT, () => {
  console.log(`\\n🚀 Advanced monitored Express app running on port ${PORT}`);
  console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
  console.log(`❤️  Health: http://localhost:${PORT}/health`);
  console.log(`ℹ️  Info: http://localhost:${PORT}/info`);
  console.log(`\\nAdvanced endpoints:`);
  console.log(`  POST http://localhost:${PORT}/api/orders`);
  console.log(`       Body: {"customerId": "123", "customerType": "premium", "items": [{"id": 1, "name": "Product A", "price": 29.99, "quantity": 2, "category": "electronics"}]}`);
  console.log(`  PATCH http://localhost:${PORT}/api/orders/abc123/status`);
  console.log(`        Body: {"status": "completed", "previousStatus": "pending"}`);
  console.log(`  GET  http://localhost:${PORT}/api/analytics/orders?timeRange=24h&customerType=premium`);
  console.log(`  DELETE http://localhost:${PORT}/api/sessions/session123`);
});

// Clean up sessions periodically
setInterval(() => {
  const now = Date.now();
  const fiveMinutesAgo = now - (5 * 60 * 1000);
  
  for (const [sessionId, session] of activeSessions.entries()) {
    if (session.lastActivity < fiveMinutesAgo) {
      activeSessions.delete(sessionId);
    }
  }
  
  metrics.currentUsers.set({ user_type: 'authenticated' }, activeSessions.size);
}, 60000); // Clean up every minute