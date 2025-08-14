const { Task, TaskStatus, TaskPriority, VALID_STATUS_TRANSITIONS } = require('../../src/models/task');

describe('Task Model - Unit Tests', () => {
  
  describe('Task Creation', () => {
    const validTaskData = {
      id: 1,
      title: 'Test Task',
      description: 'Test Description',
      dueDate: new Date(Date.now() + 86400000), // Tomorrow
      priority: TaskPriority.MEDIUM,
      tags: ['test', 'unit']
    };

    it('should create a task with valid data', () => {
      const task = new Task(validTaskData);
      
      expect(task.id).toBe(1);
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('Test Description');
      expect(task.status).toBe(TaskStatus.PENDING);
      expect(task.priority).toBe(TaskPriority.MEDIUM);
      expect(task.tags).toEqual(['test', 'unit']);
      expect(task.dependencies).toEqual([]);
      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.updatedAt).toBeInstanceOf(Date);
    });

    it('should set default values correctly', () => {
      const minimalTaskData = {
        id: 1,
        title: 'Test Task',
        description: 'Test Description',
        dueDate: new Date(Date.now() + 86400000)
      };
      
      const task = new Task(minimalTaskData);
      
      expect(task.status).toBe(TaskStatus.PENDING);
      expect(task.priority).toBe(TaskPriority.MEDIUM);
      expect(task.tags).toEqual([]);
      expect(task.dependencies).toEqual([]);
    });

    it('should handle non-array tags gracefully', () => {
      const taskData = {
        ...validTaskData,
        tags: 'not-an-array'
      };
      
      const task = new Task(taskData);
      expect(task.tags).toEqual([]);
    });

    it('should handle non-array dependencies gracefully', () => {
      const taskData = {
        ...validTaskData,
        dependencies: 'not-an-array'
      };
      
      const task = new Task(taskData);
      expect(task.dependencies).toEqual([]);
    });

    it('should convert dueDate string to Date object', () => {
      const taskData = {
        ...validTaskData,
        dueDate: '2025-12-31'
      };
      
      const task = new Task(taskData);
      expect(task.dueDate).toBeInstanceOf(Date);
    });
  });

  describe('Task Validation', () => {
    let task;

    beforeEach(() => {
      task = new Task({
        id: 1,
        title: 'Test Task',
        description: 'Test Description',
        dueDate: new Date(Date.now() + 86400000), // Tomorrow
        priority: TaskPriority.MEDIUM,
        tags: ['test']
      });
    });

    it('should validate a valid task', () => {
      expect(() => task.validate()).not.toThrow();
    });

    it('should reject tasks with past due dates', () => {
      task.dueDate = new Date(Date.now() - 86400000); // Yesterday
      expect(() => task.validate()).toThrow('Due date cannot be in the past');
    });

    it('should allow tasks with today\'s due date', () => {
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      task.dueDate = today;
      expect(() => task.validate()).not.toThrow();
    });

    it('should reject tasks without title', () => {
      task.title = '';
      expect(() => task.validate()).toThrow('Title is required');
    });

    it('should reject tasks with whitespace-only title', () => {
      task.title = '   ';
      expect(() => task.validate()).toThrow('Title is required');
    });

    it('should reject tasks without description', () => {
      task.description = '';
      expect(() => task.validate()).toThrow('Description is required');
    });

    it('should reject tasks with whitespace-only description', () => {
      task.description = '   ';
      expect(() => task.validate()).toThrow('Description is required');
    });

    it('should reject tasks without tags', () => {
      task.tags = [];
      expect(() => task.validate()).toThrow('Task must have at least one tag');
    });

    it('should reject tasks with invalid status', () => {
      task.status = 'invalid-status';
      expect(() => task.validate()).toThrow('Invalid status');
    });

    it('should reject tasks with invalid priority', () => {
      task.priority = 'invalid-priority';
      expect(() => task.validate()).toThrow('Invalid priority');
    });

    it('should reject high priority tasks being archived without completion', () => {
      task.priority = TaskPriority.HIGH;
      task.status = TaskStatus.ARCHIVED;
      expect(() => task.validate()).toThrow('High priority tasks must be completed before archiving');
    });

    it('should allow high priority tasks to be archived if completed first', () => {
      task.priority = TaskPriority.HIGH;
      task.status = TaskStatus.COMPLETED;
      expect(() => task.validate()).not.toThrow();
    });
  });

  describe('Status Transitions', () => {
    let task;

    beforeEach(() => {
      task = new Task({
        id: 1,
        title: 'Test Task',
        description: 'Test Description',
        dueDate: new Date(Date.now() + 86400000),
        tags: ['test']
      });
    });

    it('should allow valid status transitions from pending', () => {
      expect(task.canTransitionTo(TaskStatus.IN_PROGRESS)).toBe(true);
      expect(task.canTransitionTo(TaskStatus.COMPLETED)).toBe(false);
      expect(task.canTransitionTo(TaskStatus.ARCHIVED)).toBe(false);
    });

    it('should allow valid status transitions from in-progress', () => {
      task.status = TaskStatus.IN_PROGRESS;
      expect(task.canTransitionTo(TaskStatus.COMPLETED)).toBe(true);
      expect(task.canTransitionTo(TaskStatus.PENDING)).toBe(false);
      expect(task.canTransitionTo(TaskStatus.ARCHIVED)).toBe(false);
    });

    it('should allow valid status transitions from completed', () => {
      task.status = TaskStatus.COMPLETED;
      expect(task.canTransitionTo(TaskStatus.ARCHIVED)).toBe(true);
      expect(task.canTransitionTo(TaskStatus.PENDING)).toBe(false);
      expect(task.canTransitionTo(TaskStatus.IN_PROGRESS)).toBe(false);
    });

    it('should not allow any transitions from archived', () => {
      task.status = TaskStatus.ARCHIVED;
      expect(task.canTransitionTo(TaskStatus.PENDING)).toBe(false);
      expect(task.canTransitionTo(TaskStatus.IN_PROGRESS)).toBe(false);
      expect(task.canTransitionTo(TaskStatus.COMPLETED)).toBe(false);
    });
  });

  describe('Archiving Rules', () => {
    let task;

    beforeEach(() => {
      task = new Task({
        id: 1,
        title: 'Test Task',
        description: 'Test Description',
        dueDate: new Date(Date.now() + 86400000),
        tags: ['test']
      });
    });

    it('should allow low priority tasks to be archived in any status', () => {
      task.priority = TaskPriority.LOW;
      expect(task.canBeArchived()).toBe(true);
    });

    it('should allow medium priority tasks to be archived in any status', () => {
      task.priority = TaskPriority.MEDIUM;
      expect(task.canBeArchived()).toBe(true);
    });

    it('should only allow high priority tasks to be archived when completed', () => {
      task.priority = TaskPriority.HIGH;
      task.status = TaskStatus.PENDING;
      expect(task.canBeArchived()).toBe(false);

      task.status = TaskStatus.IN_PROGRESS;
      expect(task.canBeArchived()).toBe(false);

      task.status = TaskStatus.COMPLETED;
      expect(task.canBeArchived()).toBe(true);
    });
  });

  describe('Task Updates', () => {
    let task;

    beforeEach(() => {
      task = new Task({
        id: 1,
        title: 'Original Title',
        description: 'Original Description',
        dueDate: new Date(Date.now() + 86400000),
        tags: ['original']
      });
    });

    it('should update task properties', () => {
      const originalUpdatedAt = task.updatedAt;
      
      // Wait a small amount to ensure timestamp difference
      setTimeout(() => {
        task.update({
          title: 'Updated Title',
          description: 'Updated Description',
          tags: ['updated']
        });

        expect(task.title).toBe('Updated Title');
        expect(task.description).toBe('Updated Description');
        expect(task.tags).toEqual(['updated']);
        expect(task.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      }, 1);
    });

    it('should convert string dueDate to Date object on update', () => {
      task.update({ dueDate: '2025-12-31' });
      expect(task.dueDate).toBeInstanceOf(Date);
    });

    it('should not update properties that are not provided', () => {
      const originalTitle = task.title;
      task.update({ description: 'New Description' });
      
      expect(task.title).toBe(originalTitle);
      expect(task.description).toBe('New Description');
    });
  });

  describe('Constants and Enums', () => {
    it('should have correct TaskStatus values', () => {
      expect(TaskStatus.PENDING).toBe('pending');
      expect(TaskStatus.IN_PROGRESS).toBe('in-progress');
      expect(TaskStatus.COMPLETED).toBe('completed');
      expect(TaskStatus.ARCHIVED).toBe('archived');
    });

    it('should have correct TaskPriority values', () => {
      expect(TaskPriority.LOW).toBe('low');
      expect(TaskPriority.MEDIUM).toBe('medium');
      expect(TaskPriority.HIGH).toBe('high');
    });

    it('should have correct status transition mappings', () => {
      expect(VALID_STATUS_TRANSITIONS[TaskStatus.PENDING]).toEqual([TaskStatus.IN_PROGRESS]);
      expect(VALID_STATUS_TRANSITIONS[TaskStatus.IN_PROGRESS]).toEqual([TaskStatus.COMPLETED]);
      expect(VALID_STATUS_TRANSITIONS[TaskStatus.COMPLETED]).toEqual([TaskStatus.ARCHIVED]);
      expect(VALID_STATUS_TRANSITIONS[TaskStatus.ARCHIVED]).toEqual([]);
    });
  });
}); 