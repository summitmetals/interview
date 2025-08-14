const {
  detectCycle,
  wouldCreateCycle,
  getAllDependents,
  getPriorityScore,
  formatDuration,
  safeJsonParse
} = require('../../src/utils/helpers');

const { Task, TaskStatus } = require('../../src/models/task');

describe('Helper Functions - Unit Tests', () => {

  describe('Cycle Detection', () => {
    let tasks;

    beforeEach(() => {
      tasks = new Map();
      
      // Create a set of tasks for testing
      tasks.set(1, new Task({
        id: 1,
        title: 'Task 1',
        description: 'Description 1',
        dueDate: new Date(Date.now() + 86400000),
        tags: ['test'],
        dependencies: []
      }));
      
      tasks.set(2, new Task({
        id: 2,
        title: 'Task 2',
        description: 'Description 2',
        dueDate: new Date(Date.now() + 86400000),
        tags: ['test'],
        dependencies: [1]
      }));
      
      tasks.set(3, new Task({
        id: 3,
        title: 'Task 3',
        description: 'Description 3',
        dueDate: new Date(Date.now() + 86400000),
        tags: ['test'],
        dependencies: [2]
      }));
    });

    it('should not detect cycle in linear dependency chain', () => {
      expect(detectCycle(tasks, 1)).toBe(false);
      expect(detectCycle(tasks, 2)).toBe(false);
      expect(detectCycle(tasks, 3)).toBe(false);
    });

    it('should detect simple cycle (A → B → A)', () => {
      // Create a cycle: 1 → 2 → 1
      tasks.get(1).dependencies = [2];
      tasks.get(2).dependencies = [1];
      
      expect(detectCycle(tasks, 1)).toBe(true);
      expect(detectCycle(tasks, 2)).toBe(true);
    });

    it('should detect complex cycle (A → B → C → A)', () => {
      // Create a cycle: 1 → 2 → 3 → 1
      tasks.get(1).dependencies = [3];
      
      expect(detectCycle(tasks, 1)).toBe(true);
      expect(detectCycle(tasks, 2)).toBe(true);
      expect(detectCycle(tasks, 3)).toBe(true);
    });

    it('should handle self-dependency cycle', () => {
      tasks.get(1).dependencies = [1];
      expect(detectCycle(tasks, 1)).toBe(true);
    });

    it('should handle non-existent task IDs gracefully', () => {
      expect(detectCycle(tasks, 999)).toBe(false);
    });

    it('should handle tasks with non-existent dependencies', () => {
      tasks.get(1).dependencies = [999];
      expect(detectCycle(tasks, 1)).toBe(false);
    });
  });

  describe('Cycle Creation Prevention', () => {
    let tasks;

    beforeEach(() => {
      tasks = new Map();
      
      tasks.set(1, new Task({
        id: 1,
        title: 'Task 1',
        description: 'Description 1',
        dueDate: new Date(Date.now() + 86400000),
        tags: ['test'],
        dependencies: []
      }));
      
      tasks.set(2, new Task({
        id: 2,
        title: 'Task 2',
        description: 'Description 2',
        dueDate: new Date(Date.now() + 86400000),
        tags: ['test'],
        dependencies: [1]
      }));
    });

    it('should detect that adding dependency would create cycle', () => {
      // Adding 2 as dependency of 1 would create cycle: 1 → 2 → 1
      expect(wouldCreateCycle(tasks, 1, 2)).toBe(true);
    });

    it('should allow adding non-cyclical dependencies', () => {
      tasks.set(3, new Task({
        id: 3,
        title: 'Task 3',
        description: 'Description 3',
        dueDate: new Date(Date.now() + 86400000),
        tags: ['test'],
        dependencies: []
      }));
      
      // Adding 3 as dependency of 2 is fine: 1 → 2 → 3
      expect(wouldCreateCycle(tasks, 2, 3)).toBe(false);
    });

    it('should handle non-existent task', () => {
      expect(wouldCreateCycle(tasks, 999, 1)).toBe(false);
    });

    it('should detect self-dependency cycle', () => {
      expect(wouldCreateCycle(tasks, 1, 1)).toBe(true);
    });
  });

  describe('Dependent Tasks Finder', () => {
    let tasks;

    beforeEach(() => {
      tasks = new Map();
      
      // Task dependency tree:
      // 1 ← 2 ← 4
      // 1 ← 3 ← 5
      tasks.set(1, new Task({
        id: 1,
        title: 'Task 1',
        description: 'Description 1',
        dueDate: new Date(Date.now() + 86400000),
        tags: ['test'],
        dependencies: []
      }));
      
      tasks.set(2, new Task({
        id: 2,
        title: 'Task 2',
        description: 'Description 2',
        dueDate: new Date(Date.now() + 86400000),
        tags: ['test'],
        dependencies: [1]
      }));
      
      tasks.set(3, new Task({
        id: 3,
        title: 'Task 3',
        description: 'Description 3',
        dueDate: new Date(Date.now() + 86400000),
        tags: ['test'],
        dependencies: [1]
      }));
      
      tasks.set(4, new Task({
        id: 4,
        title: 'Task 4',
        description: 'Description 4',
        dueDate: new Date(Date.now() + 86400000),
        tags: ['test'],
        dependencies: [2]
      }));
      
      tasks.set(5, new Task({
        id: 5,
        title: 'Task 5',
        description: 'Description 5',
        dueDate: new Date(Date.now() + 86400000),
        tags: ['test'],
        dependencies: [3]
      }));
    });

    it('should find all direct and indirect dependents', () => {
      const dependents = getAllDependents(tasks, 1);
      expect(dependents.sort()).toEqual([2, 3, 4, 5]);
    });

    it('should find direct dependents only', () => {
      const dependents = getAllDependents(tasks, 2);
      expect(dependents).toEqual([4]);
    });

    it('should return empty array for task with no dependents', () => {
      const dependents = getAllDependents(tasks, 4);
      expect(dependents).toEqual([]);
    });

    it('should handle non-existent task', () => {
      const dependents = getAllDependents(tasks, 999);
      expect(dependents).toEqual([]);
    });
  });

  describe('Priority Score Calculation', () => {
    it('should return correct scores for valid priorities', () => {
      expect(getPriorityScore('low')).toBe(1);
      expect(getPriorityScore('medium')).toBe(2);
      expect(getPriorityScore('high')).toBe(3);
    });

    it('should return 0 for invalid priority', () => {
      expect(getPriorityScore('invalid')).toBe(0);
      expect(getPriorityScore('')).toBe(0);
      expect(getPriorityScore(null)).toBe(0);
      expect(getPriorityScore(undefined)).toBe(0);
    });
  });

  describe('Duration Formatting', () => {
    it('should format duration less than a day', () => {
      expect(formatDuration(0)).toBe('Less than a day');
      expect(formatDuration(0.5)).toBe('Less than a day');
      expect(formatDuration(0.9)).toBe('Less than a day');
    });

    it('should format single day', () => {
      expect(formatDuration(1)).toBe('1 day');
    });

    it('should format multiple days (less than a week)', () => {
      expect(formatDuration(2)).toBe('2 days');
      expect(formatDuration(3.7)).toBe('4 days');
      expect(formatDuration(6)).toBe('6 days');
    });

    it('should format single week', () => {
      expect(formatDuration(7)).toBe('1 week');
    });

    it('should format multiple weeks', () => {
      expect(formatDuration(14)).toBe('2 weeks');
      expect(formatDuration(21)).toBe('3 weeks');
      expect(formatDuration(25)).toBe('4 weeks');
    });

    it('should format single month', () => {
      expect(formatDuration(30)).toBe('1 month');
    });

    it('should format multiple months', () => {
      expect(formatDuration(60)).toBe('2 months');
      expect(formatDuration(90)).toBe('3 months');
      expect(formatDuration(365)).toBe('12 months');
    });
  });

  describe('Safe JSON Parsing', () => {
    it('should parse valid JSON', () => {
      const validJson = '{"key": "value", "number": 42}';
      const result = safeJsonParse(validJson);
      
      expect(result).toEqual({ key: 'value', number: 42 });
    });

    it('should return default value for invalid JSON', () => {
      const invalidJson = '{"invalid": json}';
      const result = safeJsonParse(invalidJson, { default: true });
      
      expect(result).toEqual({ default: true });
    });

    it('should return null as default when no default provided', () => {
      const invalidJson = 'invalid json';
      const result = safeJsonParse(invalidJson);
      
      expect(result).toBeNull();
    });

    it('should handle empty string', () => {
      const result = safeJsonParse('', 'default');
      expect(result).toBe('default');
    });

    it('should handle malformed JSON', () => {
      const malformedJson = '{"key": "value",}';
      const result = safeJsonParse(malformedJson, []);
      
      expect(result).toEqual([]);
    });

    it('should parse arrays correctly', () => {
      const arrayJson = '[1, 2, 3, "test"]';
      const result = safeJsonParse(arrayJson);
      
      expect(result).toEqual([1, 2, 3, 'test']);
    });

    it('should parse primitive values', () => {
      expect(safeJsonParse('42')).toBe(42);
      expect(safeJsonParse('"string"')).toBe('string');
      expect(safeJsonParse('true')).toBe(true);
      expect(safeJsonParse('false')).toBe(false);
      expect(safeJsonParse('null')).toBe(null);
    });
  });
}); 