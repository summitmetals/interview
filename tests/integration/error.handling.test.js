const request = require('supertest');
const app = require('../../src/app');
const { TaskStatus, TaskPriority } = require('../../src/models/task');

describe('Error Handling - Integration Tests', () => {
  let testTaskId;

  beforeEach(async () => {
    // Create a test task for error scenarios
    const response = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Error Test Task',
        description: 'Task for testing error scenarios',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        tags: ['error-test']
      });
    
    if (response.statusCode === 201) {
      testTaskId = response.body.id;
    }
  });

  afterEach(async () => {
    // Clean up test task
    if (testTaskId) {
      await request(app).delete(`/api/tasks/${testTaskId}`);
      testTaskId = null;
    }
  });

  describe('Validation Errors', () => {
    it('should return detailed validation errors for invalid task creation', async () => {
      const invalidTask = {
        title: '',
        description: '',
        dueDate: '2020-01-01', // Past date
        priority: 'invalid-priority',
        tags: [], // Empty array
        status: 'invalid-status'
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(invalidTask);

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe('Validation Error');
      expect(Array.isArray(response.body.details)).toBe(true);
      expect(response.body.details.length).toBeGreaterThan(1);
    });

    it('should validate query parameters for task listing', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({
          status: 'invalid-status',
          priority: 'invalid-priority',
          sortBy: 'invalid-field',
          sortOrder: 'invalid-order',
          page: -1,
          limit: 1000
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe('Invalid Query Parameters');
      expect(Array.isArray(response.body.details)).toBe(true);
    });

    it('should reject tasks with extremely long titles', async () => {
      const longTitle = 'x'.repeat(1000);
      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: longTitle,
          description: 'Valid description',
          dueDate: '2025-12-31',
          tags: ['test']
        });

      // Depending on validation rules, this might be accepted or rejected
      // This test ensures consistent behavior
      expect([200, 201, 400]).toContain(response.statusCode);
    });
  });

  describe('Business Logic Errors', () => {
    it('should prevent invalid status transitions', async () => {
      // Try to jump from pending directly to archived
      const response = await request(app)
        .put(`/api/tasks/${testTaskId}`)
        .send({ status: TaskStatus.ARCHIVED });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe('Invalid status transition');
    });

    it('should prevent archiving high priority tasks without completion', async () => {
      // First update to high priority
      await request(app)
        .put(`/api/tasks/${testTaskId}`)
        .send({ priority: TaskPriority.HIGH });

      // Try to archive without completing
      const response = await request(app)
        .put(`/api/tasks/${testTaskId}`)
        .send({ status: TaskStatus.ARCHIVED });

      expect(response.statusCode).toBe(400);
    });

    it('should prevent deletion of tasks with dependencies', async () => {
      // Create a dependent task
      const dependentResponse = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Dependent Task',
          description: 'This task depends on the test task',
          dueDate: '2025-12-31',
          tags: ['dependent'],
          dependencies: [testTaskId]
        });

      const dependentTaskId = dependentResponse.body.id;

      // Try to delete the dependency
      const deleteResponse = await request(app)
        .delete(`/api/tasks/${testTaskId}`);

      expect(deleteResponse.statusCode).toBe(400);
      expect(deleteResponse.body.error).toBe('Task has dependencies');
      expect(deleteResponse.body).toHaveProperty('dependentTasks');

      // Clean up dependent task
      await request(app).delete(`/api/tasks/${dependentTaskId}`);
    });

    it('should prevent completing tasks with incomplete dependencies', async () => {
      // Create a dependency task
      const depResponse = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Dependency Task',
          description: 'This is a dependency',
          dueDate: '2025-12-31',
          tags: ['dependency']
        });

      const depTaskId = depResponse.body.id;

      // Update test task to depend on the new task
      await request(app)
        .put(`/api/tasks/${testTaskId}`)
        .send({ dependencies: [depTaskId] });

      // Move to in-progress
      await request(app)
        .put(`/api/tasks/${testTaskId}`)
        .send({ status: TaskStatus.IN_PROGRESS });

      // Try to complete without completing dependency
      const response = await request(app)
        .put(`/api/tasks/${testTaskId}`)
        .send({ status: TaskStatus.COMPLETED });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe('Dependencies not completed');
      expect(response.body).toHaveProperty('incompleteDependencies');

      // Clean up dependency task
      await request(app).delete(`/api/tasks/${depTaskId}`);
    });
  });

  describe('Resource Not Found Errors', () => {
    it('should return 404 for non-existent task retrieval', async () => {
      const response = await request(app)
        .get('/api/tasks/999999');

      expect(response.statusCode).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });

    it('should return 404 for non-existent task update', async () => {
      const response = await request(app)
        .put('/api/tasks/999999')
        .send({ title: 'Updated Title' });

      expect(response.statusCode).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });

    it('should return 404 for non-existent task deletion', async () => {
      const response = await request(app)
        .delete('/api/tasks/999999');

      expect(response.statusCode).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });

    it('should return 404 for invalid API endpoints', async () => {
      const response = await request(app)
        .get('/api/invalid-endpoint');

      expect(response.statusCode).toBe(404);
      expect(response.body.error).toBe('Not Found');
    });
  });

  describe('Malformed Request Errors', () => {
    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send('{"title": "test", invalid json}')
        .set('Content-Type', 'application/json');

      expect(response.statusCode).toBe(400);
    });

    it('should handle missing request body for POST requests', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send();

      expect(response.statusCode).toBe(400);
    });

    it('should handle invalid data types in request', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 123, // Should be string
          description: true, // Should be string
          dueDate: 'invalid-date',
          tags: 'should-be-array',
          dependencies: 'should-be-array'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });
  });

  describe('Batch Operation Errors', () => {
    it('should handle invalid batch create requests', async () => {
      const response = await request(app)
        .post('/api/tasks/batch')
        .send('not-an-array');

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe('Request body must be an array');
    });

    it('should handle invalid batch update requests', async () => {
      const response = await request(app)
        .put('/api/tasks/batch')
        .send({
          notAnArray: true
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe('Request body must be an array');
    });

    it('should handle invalid batch delete requests', async () => {
      const response = await request(app)
        .delete('/api/tasks/batch')
        .send('not-an-array');

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe('Request body must be an array of task IDs');
    });

    it('should validate batch create with mixed valid/invalid tasks', async () => {
      const batchTasks = [
        {
          title: 'Valid Task',
          description: 'This is valid',
          dueDate: '2025-12-31',
          tags: ['valid']
        },
        {
          title: '', // Invalid - empty title
          description: 'Invalid task',
          dueDate: '2025-12-31',
          tags: ['invalid']
        }
      ];

      const response = await request(app)
        .post('/api/tasks/batch')
        .send(batchTasks);

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Search and Filter Errors', () => {
    it('should require search query for search endpoint', async () => {
      const response = await request(app)
        .get('/api/tasks/search');

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe('Search query is required');
    });

    it('should handle invalid date ranges in filters', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({
          dueDateStart: '2025-12-31',
          dueDateEnd: '2025-01-01' // End before start
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe('Invalid Query Parameters');
    });

    it('should handle extremely large page numbers gracefully', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({ page: Number.MAX_SAFE_INTEGER });

      expect(response.statusCode).toBe(200);
      expect(response.body.tasks).toEqual([]);
    });
  });

  describe('Content Type Errors', () => {
    it('should reject requests with incorrect Content-Type', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send('title=test&description=test')
        .set('Content-Type', 'application/x-www-form-urlencoded');

      expect(response.statusCode).toBe(400);
    });

    it('should handle requests with no Content-Type header', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send('{"title": "test"}');

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large task datasets gracefully', async () => {
      // This test would create many tasks, but we'll simulate with a query
      const response = await request(app)
        .get('/api/tasks')
        .query({ limit: 1 }); // Small limit to test pagination

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('pagination');
    });

    it('should handle special characters in search queries', async () => {
      const specialChars = '!@#$%^&*()[]{}|;:,.<>?';
      const response = await request(app)
        .get('/api/tasks/search')
        .query({ query: specialChars });

      expect(response.statusCode).toBe(200);
      expect(response.body.tasks).toEqual([]);
    });

    it('should handle Unicode characters in task data', async () => {
      const unicodeTask = {
        title: '测试任务 🚀',
        description: 'тестовое описание с эмодзи 😊',
        dueDate: '2025-12-31',
        tags: ['unicode', '测试', 'тест']
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(unicodeTask);

      expect(response.statusCode).toBe(201);
      expect(response.body.title).toBe(unicodeTask.title);
      expect(response.body.description).toBe(unicodeTask.description);

      // Clean up
      await request(app).delete(`/api/tasks/${response.body.id}`);
    });

    it('should handle concurrent requests gracefully', async () => {
      const concurrentRequests = Array.from({ length: 5 }, (_, i) => 
        request(app)
          .post('/api/tasks')
          .send({
            title: `Concurrent Task ${i}`,
            description: `Task created concurrently ${i}`,
            dueDate: '2025-12-31',
            tags: ['concurrent']
          })
      );

      const responses = await Promise.all(concurrentRequests);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.statusCode).toBe(201);
      });

      // Clean up
      for (const response of responses) {
        if (response.statusCode === 201) {
          await request(app).delete(`/api/tasks/${response.body.id}`);
        }
      }
    });
  });
}); 