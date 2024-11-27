const request = require('supertest');
const app = require('../src/app');
const { TaskStatus, TaskPriority } = require('../src/models/task');

describe('Tasks API', () => {
  let createdTaskId;

  const sampleTask = {
    title: 'Test Task',
    description: 'Test Description',
    dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    priority: TaskPriority.MEDIUM,
    tags: ['test', 'sample']
  };

  describe('GET /', () => {
    it('should return welcome message', async () => {
      const res = await request(app)
        .get('/');
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('Task Management', () => {
    // Creation, Reading, Updating, Deleting tasks
    it('should create a new task', async () => {
      const res = await request(app).post('/api/tasks').send(sampleTask);
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe(sampleTask.title);
      createdTaskId = res.body.id;
    });

    it('should return all tasks with pagination', async () => {
      const res = await request(app).get('/api/tasks').query({ page: 1, limit: 10 });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('tasks');
      expect(res.body).toHaveProperty('pagination');
    });

    it('should update task status following valid transitions', async () => {
      const res = await request(app).put(`/api/tasks/${createdTaskId}`).send({ status: TaskStatus.IN_PROGRESS });
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('should delete a task by ID', async () => {
      const res = await request(app).delete(`/api/tasks/${createdTaskId}`);
      expect(res.statusCode).toBe(204);
    });
  });

  describe('Filtering, Sorting, and Pagination', () => {
    it('should filter tasks by status', async () => {
      const res = await request(app).get('/api/tasks').query({ status: TaskStatus.PENDING });
      expect(res.statusCode).toBe(200);
      expect(res.body.tasks.every(task => task.status === TaskStatus.PENDING)).toBeTruthy();
    });

    it('should sort tasks by due date in ascending order', async () => {
      const res = await request(app).get('/api/tasks').query({ sortBy: 'dueDate', sortOrder: 'asc' });
      expect(res.statusCode).toBe(200);
    });

    it('should return an empty array for out-of-bound pages', async () => {
      const res = await request(app).get('/api/tasks').query({ page: 999, limit: 10 });
      expect(res.statusCode).toBe(200);
      expect(res.body.tasks).toEqual([]);
    });
  });

  describe('Task Dependencies', () => {
    it('should prevent completing a task if its dependencies are incomplete', async () => {
      const task1 = await request(app).post('/api/tasks').send(sampleTask);
      const task2 = await request(app).post('/api/tasks').send(sampleTask);

      await request(app).put(`/api/tasks/${task1.body.id}`).send({ dependencies: [task2.body.id] });

      const res = await request(app).put(`/api/tasks/${task1.body.id}`).send({ status: TaskStatus.COMPLETED });
      expect(res.statusCode).toBe(400);
    });

    it('should reject dependencies that create a cycle', async () => {
      const task1 = await request(app).post('/api/tasks').send(sampleTask);
      const task2 = await request(app).post('/api/tasks').send(sampleTask);

      await request(app).put(`/api/tasks/${task2.body.id}`).send({ dependencies: [task1.body.id] });

      const res = await request(app).put(`/api/tasks/${task1.body.id}`).send({ dependencies: [task2.body.id] });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('Batch Operations', () => {
    it('should create multiple tasks in a batch', async () => {
      const batchTasks = [
        { ...sampleTask, title: 'Task 1' },
        { ...sampleTask, title: 'Task 2' },
      ];
      const res = await request(app).post('/api/tasks/batch').send(batchTasks);
      expect(res.statusCode).toBe(201);
      expect(res.body.length).toBe(2);
    });

    it('should return 400 if request body is not an array', async () => {
      const res = await request(app).put('/api/tasks/batch').send({sampleTask});
    
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Validation Error');
      expect(res.body.details).toContain('"value" must be an array');
    });

    it('should fail the batch update if one update is invalid', async () => {
      const task = await request(app).post('/api/tasks').send({ ...sampleTask, title: 'Task 1' });
    
      const updates = [
        { id: task.body.id, title: 'Updated Task 1' }, // Valid update
        { id: 'invalid', status: 'completed' }, // Invalid
      ];
    
      const res = await request(app).put('/api/tasks/batch').send(updates);
    
      expect(res.statusCode).toBe(400); // Expect 404 for the batch operation failure
      expect(res.body.error).toBe('Validation Error');
      expect(res.body.details).toContain('"id" must be a number');
    });
    
    
  });

  describe('Analytics', () => {
    it('should return completion rate over time', async () => {
      const res = await request(app).get('/api/tasks/analytics/completion-rate');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('completionRate');
    });

    it('should return average time to complete tasks by priority', async () => {
      const res = await request(app).get('/api/tasks/analytics/average-completion-time');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('averageCompletionTime');
    });

    it('should return most used tags', async () => {
      const res = await request(app).get('/api/tasks/analytics/popular-tags');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBeTruthy();
    });
  });

  describe('Performance Optimizations', () => {
    it('should return cached response for repeated requests', async () => {
      const task = await request(app).post('/api/tasks').send(sampleTask);

      const firstRes = await request(app).get(`/api/tasks/${task.body.id}`);
      const secondRes = await request(app).get(`/api/tasks/${task.body.id}`);

      expect(secondRes.body).toEqual(firstRes.body);
    });

    it('should process batch requests sequentially', async () => {
      const batchTasks1 = [{ ...sampleTask, title: 'Task 1' }];
      const batchTasks2 = [{ ...sampleTask, title: 'Task 2' }];
    
      const res1 = await request(app).post('/api/tasks/batch').send(batchTasks1);
      expect(res1.statusCode).toBe(201); // Ensure the first batch is successful
    
      // Add a small delay before the second batch request to avoid hitting rate limit
      await new Promise(resolve => setTimeout(resolve, 1000)); // Delay for 1 second
    
      // Second batch request
      const res2 = await request(app).post('/api/tasks/batch').send(batchTasks2);
      expect(res2.statusCode).toBe(201); // Ensure the second batch is successful
    });

    it('should reject requests exceeding the rate limit', async () => {
      for (let i = 0; i < 101; i++) {
        await request(app).get('/api/tasks');
      }

      const res = await request(app).get('/api/tasks');
      expect(res.statusCode).toBe(429);
      expect(res.body.error).toBe('Rate limit exceeded. Please try again later.');
    });
    
  });
});