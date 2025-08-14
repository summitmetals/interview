const request = require('supertest');
const app = require('../../src/app');
const { TaskStatus, TaskPriority } = require('../../src/models/task');

describe('Performance Tests', () => {
  const createdTaskIds = [];

  afterAll(async () => {
    // Clean up all created tasks
    for (const taskId of createdTaskIds) {
      try {
        await request(app).delete(`/api/tasks/${taskId}`);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('Load Testing', () => {
    it('should handle creating 100 tasks efficiently', async () => {
      const startTime = Date.now();
      const taskPromises = [];

      for (let i = 0; i < 100; i++) {
        const taskPromise = request(app)
          .post('/api/tasks')
          .send({
            title: `Load Test Task ${i}`,
            description: `Task created during load test iteration ${i}`,
            dueDate: new Date(Date.now() + 86400000 + i * 1000).toISOString(),
            priority: i % 3 === 0 ? TaskPriority.HIGH : i % 3 === 1 ? TaskPriority.MEDIUM : TaskPriority.LOW,
            tags: [`load-test`, `batch-${Math.floor(i / 10)}`]
          });
        
        taskPromises.push(taskPromise);
      }

      const responses = await Promise.all(taskPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('id');
        createdTaskIds.push(response.body.id);
      });

      // Performance assertion - should complete within reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds max
      
      console.log(`Created 100 tasks in ${duration}ms (${(duration/100).toFixed(2)}ms per task)`);
    }, 15000); // 15 second timeout

    it('should handle pagination with large datasets efficiently', async () => {
      const startTime = Date.now();
      
      // Test large pagination requests
      const pagePromises = [];
      for (let page = 1; page <= 10; page++) {
        pagePromises.push(
          request(app)
            .get('/api/tasks')
            .query({ page, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' })
        );
      }

      const responses = await Promise.all(pagePromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('tasks');
        expect(response.body).toHaveProperty('pagination');
      });

      expect(duration).toBeLessThan(5000); // 5 seconds max
      console.log(`Fetched 10 pages in ${duration}ms (${(duration/10).toFixed(2)}ms per page)`);
    });

    it('should handle concurrent search requests efficiently', async () => {
      const searchQueries = [
        'Load Test',
        'Task',
        'batch',
        'test',
        'iteration',
        'created',
        'during',
        'load'
      ];

      const startTime = Date.now();
      
      const searchPromises = searchQueries.map(query =>
        request(app)
          .get('/api/tasks/search')
          .query({ query, limit: 10 })
      );

      const responses = await Promise.all(searchPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('tasks');
      });

      expect(duration).toBeLessThan(3000); // 3 seconds max
      console.log(`Executed ${searchQueries.length} concurrent searches in ${duration}ms`);
    });

    it('should handle batch operations efficiently', async () => {
      // Test batch update
      const taskIdsToUpdate = createdTaskIds.slice(0, 50);
      const batchUpdates = taskIdsToUpdate.map((id, index) => ({
        id,
        title: `Updated Batch Task ${index}`,
        priority: TaskPriority.HIGH
      }));

      const startTime = Date.now();
      
      const response = await request(app)
        .put('/api/tasks/batch')
        .send(batchUpdates);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(50);

      expect(duration).toBeLessThan(3000); // 3 seconds max
      console.log(`Batch updated 50 tasks in ${duration}ms (${(duration/50).toFixed(2)}ms per task)`);
    });
  });

  describe('Stress Testing', () => {
    it('should handle rapid sequential requests', async () => {
      const numberOfRequests = 50;
      const startTime = Date.now();

      for (let i = 0; i < numberOfRequests; i++) {
        const response = await request(app)
          .get('/api/tasks')
          .query({ page: 1, limit: 5 });
        
        expect(response.statusCode).toBe(200);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(15000); // 15 seconds max
      console.log(`Executed ${numberOfRequests} sequential requests in ${duration}ms`);
    });

    it('should handle mixed operation load', async () => {
      const operations = [];
      const startTime = Date.now();

      // Mix of different operations
      for (let i = 0; i < 20; i++) {
        // Create task
        operations.push(
          request(app)
            .post('/api/tasks')
            .send({
              title: `Stress Test Task ${i}`,
              description: `Stress test task ${i}`,
              dueDate: new Date(Date.now() + 86400000).toISOString(),
              tags: ['stress-test']
            })
            .then(response => {
              if (response.statusCode === 201) {
                createdTaskIds.push(response.body.id);
              }
              return response;
            })
        );

        // Get tasks
        operations.push(
          request(app)
            .get('/api/tasks')
            .query({ limit: 10 })
        );

        // Search
        operations.push(
          request(app)
            .get('/api/tasks/search')
            .query({ query: 'test' })
        );

        // Analytics
        operations.push(
          request(app)
            .get('/api/tasks/analytics/completion-rate')
        );
      }

      const responses = await Promise.all(operations);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify most operations succeeded
      const successfulResponses = responses.filter(r => r.statusCode < 400);
      expect(successfulResponses.length).toBeGreaterThan(operations.length * 0.9); // 90% success rate

      console.log(`Executed ${operations.length} mixed operations in ${duration}ms`);
    });

    it('should maintain data consistency under concurrent modifications', async () => {
      // Create a test task
      const createResponse = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Concurrency Test Task',
          description: 'Task for testing concurrent modifications',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          tags: ['concurrency-test']
        });

      expect(createResponse.statusCode).toBe(201);
      const taskId = createResponse.body.id;
      createdTaskIds.push(taskId);

      // Attempt concurrent updates
      const concurrentUpdates = [];
      for (let i = 0; i < 10; i++) {
        concurrentUpdates.push(
          request(app)
            .put(`/api/tasks/${taskId}`)
            .send({
              title: `Updated Title ${i}`,
              description: `Updated by concurrent request ${i}`
            })
        );
      }

      const updateResponses = await Promise.all(concurrentUpdates);
      
      // At least some updates should succeed
      const successfulUpdates = updateResponses.filter(r => r.statusCode === 200);
      expect(successfulUpdates.length).toBeGreaterThan(0);

      // Final state should be consistent
      const finalState = await request(app).get(`/api/tasks/${taskId}`);
      expect(finalState.statusCode).toBe(200);
      expect(finalState.body).toHaveProperty('title');
      expect(finalState.body).toHaveProperty('description');
    });
  });

  describe('Memory Usage', () => {
    it('should not have significant memory leaks during repeated operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform many operations
      for (let i = 0; i < 100; i++) {
        await request(app)
          .get('/api/tasks')
          .query({ page: 1, limit: 10 });
        
        await request(app)
          .get('/api/tasks/analytics/completion-rate');
        
        await request(app)
          .get('/api/tasks/search')
          .query({ query: 'test' });
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      
      console.log(`Memory increase after 300 operations: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Response Time Consistency', () => {
    it('should maintain consistent response times under normal load', async () => {
      const responseTimes = [];
      
      for (let i = 0; i < 50; i++) {
        const startTime = Date.now();
        
        const response = await request(app)
          .get('/api/tasks')
          .query({ page: 1, limit: 10 });
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        responseTimes.push(responseTime);
        expect(response.statusCode).toBe(200);
      }

      // Calculate statistics
      const averageTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxTime = Math.max(...responseTimes);
      const minTime = Math.min(...responseTimes);
      
      console.log(`Response times - Avg: ${averageTime.toFixed(2)}ms, Min: ${minTime}ms, Max: ${maxTime}ms`);
      
      // Most requests should be under 100ms
      const fastRequests = responseTimes.filter(time => time < 100);
      expect(fastRequests.length).toBeGreaterThan(responseTimes.length * 0.8); // 80% under 100ms
      
      // No request should take more than 1 second
      expect(maxTime).toBeLessThan(1000);
    });
  });

  describe('Error Rate Under Load', () => {
    it('should maintain low error rate under sustained load', async () => {
      const requests = [];
      const numberOfRequests = 100;
      
      // Generate a mix of valid and some potentially problematic requests
      for (let i = 0; i < numberOfRequests; i++) {
        if (i % 10 === 0) {
          // Occasionally try to access non-existent task
          requests.push(
            request(app)
              .get(`/api/tasks/${999900 + i}`)
              .then(response => ({ status: response.statusCode, expected: 404 }))
          );
        } else {
          // Normal valid requests
          requests.push(
            request(app)
              .get('/api/tasks')
              .query({ page: (i % 5) + 1, limit: 5 })
              .then(response => ({ status: response.statusCode, expected: 200 }))
          );
        }
      }
      
      const responses = await Promise.all(requests);
      
      // Count errors vs expected errors
      const unexpectedErrors = responses.filter(r => 
        r.status !== r.expected && r.status >= 500
      ).length;
      
      // Should have very few unexpected server errors
      expect(unexpectedErrors).toBeLessThan(numberOfRequests * 0.01); // Less than 1%
      
      console.log(`Unexpected error rate: ${(unexpectedErrors / numberOfRequests * 100).toFixed(2)}%`);
    });
  });
}); 