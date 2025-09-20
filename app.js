/**
 * Express Application with OpenTelemetry Tracing
 * 
 * This application demonstrates basic HTTP tracing using OpenTelemetry.
 * The instrumentation must be loaded first to capture all HTTP requests.
 */

// IMPORTANT: Load OpenTelemetry instrumentation first
require('instrumentation');

const express = require('express');

// Application configuration
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for logging requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Hello, OpenTelemetry!',
    timestamp: new Date().toISOString(),
    service: 'nodejs-opentelemetry-app'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.get('/slow', (req, res) => {
  // Simulate a slow operation for demonstration
  const delay = Math.random() * 1000 + 500; // 500-1500ms
  
  setTimeout(() => {
    res.json({
      message: 'This was a slow request',
      delay: `${Math.round(delay)}ms`,
      timestamp: new Date().toISOString()
    });
  }, delay);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`[App] Server running at http://localhost:${PORT}`);
  console.log(`[App] Available routes:`);
  console.log(`  GET /        - Welcome message`);
  console.log(`  GET /health  - Health check`);
  console.log(`  GET /slow    - Slow response demo`);
});