// Global test setup and utilities

// Set test environment
process.env.NODE_ENV = 'test';

// Increase Jest timeout for integration tests
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  /**
   * Creates a valid task data object for testing
   * @param {Object} overrides - Properties to override
   * @returns {Object} Task data object
   */
  createValidTaskData: (overrides = {}) => {
    const { TaskPriority } = require('../src/models/task');
    
    return {
      title: 'Test Task',
      description: 'Test Description',
      dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      priority: TaskPriority.MEDIUM,
      tags: ['test'],
      dependencies: [],
      ...overrides
    };
  },

  /**
   * Creates multiple valid task data objects
   * @param {number} count - Number of tasks to create
   * @param {Object} baseOverrides - Base overrides for all tasks
   * @returns {Array} Array of task data objects
   */
  createMultipleTaskData: (count, baseOverrides = {}) => {
    return Array.from({ length: count }, (_, index) => 
      global.testUtils.createValidTaskData({
        title: `Test Task ${index + 1}`,
        description: `Test Description ${index + 1}`,
        tags: [`test-${index + 1}`],
        ...baseOverrides
      })
    );
  },

  /**
   * Waits for a specified amount of time
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise} Promise that resolves after the specified time
   */
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Generates a random string of specified length
   * @param {number} length - Length of the string
   * @returns {string} Random string
   */
  randomString: (length = 10) => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Creates a task using the API and returns the response
   * @param {Object} app - Express app instance
   * @param {Object} taskData - Task data to create
   * @returns {Promise} Supertest response
   */
  createTaskViaAPI: async (app, taskData = {}) => {
    const request = require('supertest');
    const validTaskData = global.testUtils.createValidTaskData(taskData);
    
    return await request(app)
      .post('/api/tasks')
      .send(validTaskData);
  },

  /**
   * Cleans up tasks by deleting them via API
   * @param {Object} app - Express app instance
   * @param {Array} taskIds - Array of task IDs to delete
   * @returns {Promise} Promise that resolves when all tasks are deleted
   */
  cleanupTasks: async (app, taskIds) => {
    const request = require('supertest');
    const deletePromises = taskIds.map(id => 
      request(app).delete(`/api/tasks/${id}`).catch(() => {})
    );
    
    await Promise.all(deletePromises);
  }
};

// Console setup for test output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// Suppress console output during tests unless explicitly enabled
if (!process.env.VERBOSE_TESTS) {
  console.log = (...args) => {
    // Allow performance test logs
    if (args[0] && typeof args[0] === 'string' && 
        (args[0].includes('ms') || args[0].includes('operations') || args[0].includes('Memory'))) {
      originalConsoleLog(...args);
    }
  };
  
  console.error = (...args) => {
    // Always show errors
    originalConsoleError(...args);
  };
}

// Setup for test databases/storage
beforeAll(async () => {
  // Clear any existing test data
  // In a real application, this might reset a test database
  console.log('🧪 Setting up test environment...');
});

afterAll(async () => {
  // Cleanup after all tests
  console.log('🧹 Cleaning up test environment...');
  
  // Restore console functions
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in tests, just log the error
});

module.exports = global.testUtils; 