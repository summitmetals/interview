const request = require('supertest');
const app = require('../../src/app');
const { TaskStatus, TaskPriority } = require('../../src/models/task');

describe('API Endpoints - Integration Tests', () => {
  let createdTasks = [];

  // Helper function to create a test task
  const createTestTask = async (overrides = {}) => {
    const defaultTask = {
      title: 'Test Task',
      description: 'Test Description',
      dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      priority: TaskPriority.MEDIUM,
      tags: ['test']
    };

    const taskData = { ...defaultTask, ...overrides };
    const response = await request(app)
      .post('/api/tasks')
      .send(taskData);

    if (response.statusCode === 201) {
      createdTasks.push(response.body.id);
    }

    return response;
  };

  // Clean up created tasks after each test
  afterEach(async () => {
    // Clean up in reverse order to handle dependencies
    for (const taskId of createdTasks.reverse()) {
      await request(app).delete(`/api/tasks/${taskId}`);
    }
    createdTasks = [];
  });

  describe('POST /api/tasks - Create Task', () => {
    it('should create a new task with valid data', async () => {
      const taskData = {
        title: 'New Task',
        description: 'Task description',
        dueDate: '2025-12-31',
        priority: TaskPriority.HIGH,
        tags: ['important', 'urgent']
      };

      const response = await createTestTask(taskData);

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(taskData.title);
      expect(response.body.description).toBe(taskData.description);
      expect(response.body.priority).toBe(taskData.priority);
      expect(response.body.status).toBe(TaskStatus.PENDING);
      expect(response.body.tags).toEqual(taskData.tags);
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should set default values for optional fields', async () => {
      const minimalTask = {
        title: 'Minimal Task',
        description: 'Minimal description',
        dueDate: '2025-12-31',
        tags: ['minimal']
      };

      const response = await createTestTask(minimalTask);

      expect(response.statusCode).toBe(201);
      expect(response.body.status).toBe(TaskStatus.PENDING);
      expect(response.body.priority).toBe(TaskPriority.MEDIUM);
      expect(response.body.dependencies).toEqual([]);
    });

    it('should reject task with missing required fields', async () => {
      const incompleteTask = {
        title: 'Incomplete Task'
        // Missing description, dueDate, tags
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(incompleteTask);

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
      expect(Array.isArray(response.body.details)).toBe(true);
    });

    it('should reject task with past due date', async () => {
      const taskWithPastDate = {
        title: 'Past Task',
        description: 'This task has a past due date',
        dueDate: '2020-01-01',
        tags: ['past']
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(taskWithPastDate);

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });

    it('should reject task without tags', async () => {
      const taskWithoutTags = {
        title: 'No Tags Task',
        description: 'This task has no tags',
        dueDate: '2025-12-31',
        tags: []
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(taskWithoutTags);

      expect(response.statusCode).toBe(400);
    });

    it('should create task with dependencies', async () => {
      // First create a dependency task
      const dependencyTask = await createTestTask({
        title: 'Dependency Task',
        description: 'This task will be a dependency',
        tags: ['dependency']
      });

      // Then create a task that depends on it
      const taskWithDependency = {
        title: 'Dependent Task',
        description: 'This task depends on another',
        dueDate: '2025-12-31',
        tags: ['dependent'],
        dependencies: [dependencyTask.body.id]
      };

      const response = await createTestTask(taskWithDependency);

      expect(response.statusCode).toBe(201);
      expect(response.body.dependencies).toEqual([dependencyTask.body.id]);
    });
  });

  describe('GET /api/tasks - List Tasks', () => {
    beforeEach(async () => {
      // Create multiple test tasks with different properties
      await createTestTask({
        title: 'High Priority Task',
        priority: TaskPriority.HIGH,
        tags: ['urgent', 'important']
      });

      await createTestTask({
        title: 'Low Priority Task',
        priority: TaskPriority.LOW,
        tags: ['normal', 'routine']
      });

      await createTestTask({
        title: 'Medium Priority Task',
        priority: TaskPriority.MEDIUM,
        tags: ['standard'],
        dueDate: '2025-01-01'
      });
    });

    it('should return all tasks with pagination', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({ page: 1, limit: 10 });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('tasks');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.tasks)).toBe(true);
      expect(response.body.tasks.length).toBeGreaterThanOrEqual(1);
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(1);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.pages).toBeGreaterThanOrEqual(1);
    });

    it('should filter tasks by status', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({ status: TaskStatus.PENDING });

      expect(response.statusCode).toBe(200);
      expect(response.body.tasks.every(task => task.status === TaskStatus.PENDING)).toBe(true);
    });

    it('should filter tasks by priority', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({ priority: TaskPriority.HIGH });

      expect(response.statusCode).toBe(200);
      expect(response.body.tasks.every(task => task.priority === TaskPriority.HIGH)).toBe(true);
      expect(response.body.tasks.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter tasks by tags', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({ tags: 'urgent,important' });

      expect(response.statusCode).toBe(200);
      expect(response.body.tasks.length).toBeGreaterThanOrEqual(1);
      // Check that returned tasks have at least one of the specified tags
      response.body.tasks.forEach(task => {
        expect(
          task.tags.some(tag => ['urgent', 'important'].includes(tag))
        ).toBe(true);
      });
    });

    it('should sort tasks by priority', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({ sortBy: 'priority', sortOrder: 'desc' });

      expect(response.statusCode).toBe(200);
      
      // Verify sorting (high=3, medium=2, low=1)
      const priorities = response.body.tasks.map(task => task.priority);
      const priorityScores = priorities.map(p => 
        p === 'high' ? 3 : p === 'medium' ? 2 : 1
      );
      
      for (let i = 1; i < priorityScores.length; i++) {
        expect(priorityScores[i]).toBeLessThanOrEqual(priorityScores[i - 1]);
      }
    });

    it('should sort tasks by due date', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({ sortBy: 'dueDate', sortOrder: 'asc' });

      expect(response.statusCode).toBe(200);
      
      const dueDates = response.body.tasks.map(task => new Date(task.dueDate));
      for (let i = 1; i < dueDates.length; i++) {
        expect(dueDates[i].getTime()).toBeGreaterThanOrEqual(dueDates[i - 1].getTime());
      }
    });

    it('should implement pagination correctly', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({ page: 1, limit: 2 });

      expect(response.statusCode).toBe(200);
      expect(response.body.tasks.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.pages).toBeGreaterThanOrEqual(1);
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({ status: 'invalid-status' });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe('Invalid Query Parameters');
    });
  });

  describe('GET /api/tasks/:id - Get Task by ID', () => {
    let taskId;

    beforeEach(async () => {
      const response = await createTestTask({
        title: 'Test Task for ID',
        description: 'This task will be retrieved by ID'
      });
      taskId = response.body.id;
    });

    it('should return a specific task by ID', async () => {
      const response = await request(app)
        .get(`/api/tasks/${taskId}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.id).toBe(taskId);
      expect(response.body.title).toBe('Test Task for ID');
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .get('/api/tasks/999999');

      expect(response.statusCode).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });
  });

  describe('PUT /api/tasks/:id - Update Task', () => {
    let taskId;

    beforeEach(async () => {
      const response = await createTestTask({
        title: 'Task to Update',
        description: 'This task will be updated',
        priority: TaskPriority.LOW
      });
      taskId = response.body.id;
    });

    it('should update task properties', async () => {
      const updateData = {
        title: 'Updated Task Title',
        priority: TaskPriority.HIGH,
        tags: ['updated', 'modified']
      };

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send(updateData);

      expect(response.statusCode).toBe(200);
      expect(response.body.title).toBe(updateData.title);
      expect(response.body.priority).toBe(updateData.priority);
      expect(response.body.tags).toEqual(updateData.tags);
      expect(new Date(response.body.updatedAt).getTime()).toBeGreaterThan(
        new Date(response.body.createdAt).getTime()
      );
    });

    it('should allow valid status transitions', async () => {
      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({ status: TaskStatus.IN_PROGRESS });

      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('should reject invalid status transitions', async () => {
      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({ status: TaskStatus.ARCHIVED });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe('Invalid status transition');
    });

    it('should validate dependencies completion before marking as completed', async () => {
      // Create a dependency task
      const depTask = await createTestTask({
        title: 'Dependency Task',
        tags: ['dependency']
      });

      // Update main task to depend on the other
      await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({ dependencies: [depTask.body.id] });

      // Move to in-progress first (valid transition)
      await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({ status: TaskStatus.IN_PROGRESS });

      // Try to mark as completed without completing dependency
      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({ status: TaskStatus.COMPLETED });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe('Dependencies not completed');
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .put('/api/tasks/999999')
        .send({ title: 'Updated Title' });

      expect(response.statusCode).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });
  });

  describe('DELETE /api/tasks/:id - Delete Task', () => {
    let taskId;

    beforeEach(async () => {
      const response = await createTestTask({
        title: 'Task to Delete',
        description: 'This task will be deleted'
      });
      taskId = response.body.id;
    });

    it('should delete a task successfully', async () => {
      const response = await request(app)
        .delete(`/api/tasks/${taskId}`);

      expect(response.statusCode).toBe(204);

      // Verify task is deleted
      const getResponse = await request(app)
        .get(`/api/tasks/${taskId}`);
      expect(getResponse.statusCode).toBe(404);

      // Remove from cleanup list since it's already deleted
      createdTasks = createdTasks.filter(id => id !== taskId);
    });

    it('should prevent deletion of task with dependents', async () => {
      // Create a dependent task
      const dependentTask = await createTestTask({
        title: 'Dependent Task',
        description: 'This task depends on another',
        dependencies: [taskId]
      });

      const response = await request(app)
        .delete(`/api/tasks/${taskId}`);

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe('Task has dependencies');
      expect(response.body).toHaveProperty('dependentTasks');
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .delete('/api/tasks/999999');

      expect(response.statusCode).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });
  });

  describe('GET /api/tasks/search - Search Tasks', () => {
    beforeEach(async () => {
      await createTestTask({
        title: 'Documentation Task',
        description: 'Write comprehensive documentation'
      });

      await createTestTask({
        title: 'Testing Task',
        description: 'Create unit tests for the application'
      });

      await createTestTask({
        title: 'Deployment Task',
        description: 'Deploy application to production'
      });
    });

    it('should search tasks by title', async () => {
      const response = await request(app)
        .get('/api/tasks/search')
        .query({ query: 'Documentation' });

      expect(response.statusCode).toBe(200);
      expect(response.body.tasks.length).toBeGreaterThanOrEqual(1);
      expect(response.body.tasks[0].title).toContain('Documentation');
    });

    it('should search tasks by description', async () => {
      const response = await request(app)
        .get('/api/tasks/search')
        .query({ query: 'unit tests' });

      expect(response.statusCode).toBe(200);
      expect(response.body.tasks.length).toBeGreaterThanOrEqual(1);
      expect(response.body.tasks[0].description).toContain('unit tests');
    });

    it('should perform case-insensitive search', async () => {
      const response = await request(app)
        .get('/api/tasks/search')
        .query({ query: 'DOCUMENTATION' });

      expect(response.statusCode).toBe(200);
      expect(response.body.tasks.length).toBeGreaterThanOrEqual(1);
    });

    it('should include pagination in search results', async () => {
      const response = await request(app)
        .get('/api/tasks/search')
        .query({ query: 'Task', page: 1, limit: 2 });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.tasks.length).toBeLessThanOrEqual(2);
    });

    it('should require search query', async () => {
      const response = await request(app)
        .get('/api/tasks/search');

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe('Search query is required');
    });
  });

  describe('Batch Operations', () => {
    describe('POST /api/tasks/batch - Batch Create', () => {
      it('should create multiple tasks atomically', async () => {
        const batchTasks = [
          {
            title: 'Batch Task 1',
            description: 'First batch task',
            dueDate: '2025-12-31',
            tags: ['batch', 'first']
          },
          {
            title: 'Batch Task 2',
            description: 'Second batch task',
            dueDate: '2025-11-30',
            tags: ['batch', 'second']
          }
        ];

        const response = await request(app)
          .post('/api/tasks/batch')
          .send(batchTasks);

        expect(response.statusCode).toBe(201);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(2);
        
        // Add to cleanup
        response.body.forEach(task => createdTasks.push(task.id));
      });

      it('should reject batch if any task is invalid', async () => {
        const batchTasks = [
          {
            title: 'Valid Task',
            description: 'This task is valid',
            dueDate: '2025-12-31',
            tags: ['valid']
          },
          {
            title: 'Invalid Task',
            description: 'This task has past due date',
            dueDate: '2020-01-01',
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

    describe('PUT /api/tasks/batch - Batch Update', () => {
      let taskIds;

      beforeEach(async () => {
        const task1 = await createTestTask({
          title: 'Batch Update Task 1',
          tags: ['batch-update']
        });
        const task2 = await createTestTask({
          title: 'Batch Update Task 2',
          tags: ['batch-update']
        });
        taskIds = [task1.body.id, task2.body.id];
      });

      it('should update multiple tasks', async () => {
        const batchUpdates = [
          {
            id: taskIds[0],
            title: 'Updated Batch Task 1',
            priority: TaskPriority.HIGH
          },
          {
            id: taskIds[1],
            title: 'Updated Batch Task 2',
            priority: TaskPriority.LOW
          }
        ];

        const response = await request(app)
          .put('/api/tasks/batch')
          .send(batchUpdates);

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(2);
        expect(response.body[0].title).toBe('Updated Batch Task 1');
        expect(response.body[1].title).toBe('Updated Batch Task 2');
      });

      it('should handle partial failures gracefully', async () => {
        const batchUpdates = [
          {
            id: taskIds[0],
            title: 'Valid Update'
          },
          {
            id: 999999,
            title: 'Invalid Update - Non-existent ID'
          }
        ];

        const response = await request(app)
          .put('/api/tasks/batch')
          .send(batchUpdates);

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe('Some updates failed');
        expect(response.body.successfulUpdates).toBe(1);
        expect(Array.isArray(response.body.errors)).toBe(true);
      });
    });

    describe('DELETE /api/tasks/batch - Batch Delete', () => {
      let taskIds;

      beforeEach(async () => {
        const task1 = await createTestTask({
          title: 'Batch Delete Task 1',
          tags: ['batch-delete']
        });
        const task2 = await createTestTask({
          title: 'Batch Delete Task 2',
          tags: ['batch-delete']
        });
        taskIds = [task1.body.id, task2.body.id];
      });

      it('should delete multiple tasks', async () => {
        const response = await request(app)
          .delete('/api/tasks/batch')
          .send(taskIds);

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toContain('Successfully deleted');
        expect(response.body.deletedIds).toEqual(taskIds);

        // Remove from cleanup since they're deleted
        createdTasks = createdTasks.filter(id => !taskIds.includes(id));
      });

      it('should handle partial failures gracefully', async () => {
        const mixedIds = [...taskIds, 999999];

        const response = await request(app)
          .delete('/api/tasks/batch')
          .send(mixedIds);

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe('Some deletions failed');
        expect(response.body.deletedCount).toBe(2);
        expect(Array.isArray(response.body.errors)).toBe(true);

        // Remove successfully deleted tasks from cleanup
        createdTasks = createdTasks.filter(id => !taskIds.includes(id));
      });
    });
  });

  describe('Analytics Endpoints', () => {
    beforeEach(async () => {
      // Create tasks with different statuses for analytics
      const task1 = await createTestTask({
        title: 'Completed Task',
        tags: ['analytics']
      });

      // Update to completed
      await request(app)
        .put(`/api/tasks/${task1.body.id}`)
        .send({ status: TaskStatus.IN_PROGRESS });
      
      await request(app)
        .put(`/api/tasks/${task1.body.id}`)
        .send({ status: TaskStatus.COMPLETED });

      await createTestTask({
        title: 'Pending Task',
        tags: ['analytics', 'pending']
      });
    });

    describe('GET /api/tasks/analytics/completion-rate', () => {
      it('should return completion rate statistics', async () => {
        const response = await request(app)
          .get('/api/tasks/analytics/completion-rate');

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('total');
        expect(response.body).toHaveProperty('completed');
        expect(response.body).toHaveProperty('completionRate');
        expect(typeof response.body.total).toBe('number');
        expect(typeof response.body.completed).toBe('number');
        expect(typeof response.body.completionRate).toBe('string');
        expect(response.body.completionRate).toMatch(/\d+\.\d+%/);
      });
    });

    describe('GET /api/tasks/analytics/average-completion-time', () => {
      it('should return average completion time statistics', async () => {
        const response = await request(app)
          .get('/api/tasks/analytics/average-completion-time');

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('averageCompletionTime');
        expect(response.body).toHaveProperty('totalTasksCompleted');
        expect(typeof response.body.averageCompletionTime).toBe('string');
        expect(typeof response.body.totalTasksCompleted).toBe('number');
      });
    });

    describe('GET /api/tasks/analytics/popular-tags', () => {
      it('should return popular tags statistics', async () => {
        const response = await request(app)
          .get('/api/tasks/analytics/popular-tags');

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        
        if (response.body.length > 0) {
          expect(response.body[0]).toHaveProperty('tag');
          expect(response.body[0]).toHaveProperty('count');
          expect(typeof response.body[0].tag).toBe('string');
          expect(typeof response.body[0].count).toBe('number');
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send('invalid json')
        .set('Content-Type', 'application/json');

      expect(response.statusCode).toBe(400);
    });

    it('should handle missing Content-Type header', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send('{"title": "test"}');

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/nonexistent');

      expect(response.statusCode).toBe(404);
      expect(response.body.error).toBe('Not Found');
    });
  });
}); 