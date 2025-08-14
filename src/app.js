const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Import routes
const taskRoutes = require('./routes/tasks');

// Middleware
app.use(cors());

// Custom JSON parser with better error handling
app.use('/api', (req, res, next) => {
  express.json()(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        error: 'Invalid JSON',
        message: 'Request body contains invalid JSON'
      });
    }
    next();
  });
});

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Task Management API Documentation'
}));

// Welcome route with API documentation links
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to the Task Management API',
    documentation: {
      'Interactive API Docs': `${req.protocol}://${req.get('host')}/api-docs`,
      'API Base URL': `${req.protocol}://${req.get('host')}/api`,
      'Version': '1.0.0'
    },
    endpoints: {
      'Tasks': '/api/tasks',
      'Search': '/api/tasks/search',
      'Analytics': '/api/tasks/analytics/*',
      'Batch Operations': '/api/tasks/batch'
    }
  });
});

// API routes
app.use('/api/tasks', taskRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  // Log error in development
  if (process.env.NODE_ENV !== 'test') {
    console.error(err.stack);
  }
  
  // Handle specific error types
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Invalid JSON',
      message: 'Request body contains invalid JSON'
    });
  }

  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
    console.log(`📚 API Documentation available at: http://localhost:${port}/api-docs`);
    console.log(`🔗 API Base URL: http://localhost:${port}/api`);
  });
}

module.exports = app;
