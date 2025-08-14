const { Task, TaskStatus } = require('../models/task');
const { differenceInDays } = require('date-fns');

// In-memory storage
const tasks = new Map();
let nextId = 1;

// Helper function for filtering tasks
const filterTasks = (tasks, filters) => {
  return Array.from(tasks.values()).filter(task => {
    if (filters.status && task.status !== filters.status) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.dueDateStart && task.dueDate < new Date(filters.dueDateStart)) return false;
    if (filters.dueDateEnd && task.dueDate > new Date(filters.dueDateEnd)) return false;
    if (filters.tags && !filters.tags.some(tag => task.tags.includes(tag))) return false;
    return true;
  });
};

// Helper function for sorting tasks
const sortTasks = (tasks, sortBy = 'createdAt', sortOrder = 'desc') => {
  return tasks.sort((a, b) => {
    const multiplier = sortOrder === 'desc' ? -1 : 1;
    
    if (sortBy === 'priority') {
      const priorityOrder = { 'low': 1, 'medium': 2, 'high': 3 };
      return multiplier * (priorityOrder[a.priority] - priorityOrder[b.priority]);
    }
    
    if (a[sortBy] instanceof Date && b[sortBy] instanceof Date) {
      return multiplier * (a[sortBy].getTime() - b[sortBy].getTime());
    }
    
    return multiplier * (a[sortBy] > b[sortBy] ? 1 : -1);
  });
};

// CRUD Operations
exports.createTask = async (req, res) => {
  try {
    const task = new Task({ id: nextId++, ...req.body });
    task.validate();
    tasks.set(task.id, task);
    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getTasks = async (req, res) => {
  try {
    // Parse tags from query string if present
    const filters = { ...req.query };
    if (filters.tags && typeof filters.tags === 'string') {
      filters.tags = filters.tags.split(',');
    }

    let filteredTasks = filterTasks(tasks, filters);
    filteredTasks = sortTasks(filteredTasks, req.query.sortBy, req.query.sortOrder);

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const paginatedTasks = filteredTasks.slice(startIndex, endIndex);
    
    res.json({
      tasks: paginatedTasks,
      pagination: {
        total: filteredTasks.length,
        page,
        pages: Math.ceil(filteredTasks.length / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTaskById = async (req, res) => {
  const task = tasks.get(parseInt(req.params.id));
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
};

exports.updateTask = async (req, res) => {
  try {
    const task = tasks.get(parseInt(req.params.id));
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check status transition
    if (req.body.status && !task.canTransitionTo(req.body.status)) {
      return res.status(400).json({ error: 'Invalid status transition' });
    }

    // Check dependencies if transitioning to completed
    if (req.body.status === TaskStatus.COMPLETED && task.dependencies.length > 0) {
      const incompleteDependencies = task.dependencies.filter(
        depId => !tasks.get(depId) || tasks.get(depId).status !== TaskStatus.COMPLETED
      );

      if (incompleteDependencies.length > 0) {
        return res.status(400).json({
          error: 'Dependencies not completed',
          message: 'All dependencies must be completed before marking task as completed',
          incompleteDependencies
        });
      }
    }

    task.update(req.body);
    task.validate();
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteTask = async (req, res) => {
  const taskId = parseInt(req.params.id);
  if (!tasks.has(taskId)) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Check if task is a dependency for other tasks
  const dependentTasks = Array.from(tasks.values())
    .filter(task => task.dependencies.includes(taskId));

  if (dependentTasks.length > 0) {
    return res.status(400).json({
      error: 'Task has dependencies',
      message: 'Cannot delete task that is a dependency for other tasks',
      dependentTasks: dependentTasks.map(t => ({ id: t.id, title: t.title }))
    });
  }

  tasks.delete(taskId);
  res.status(204).send();
};

// Search functionality
exports.searchTasks = async (req, res) => {
  const { query, page = 1, limit = 10 } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const searchResults = Array.from(tasks.values()).filter(task =>
    task.title.toLowerCase().includes(query.toLowerCase()) ||
    task.description.toLowerCase().includes(query.toLowerCase())
  );

  // Apply pagination to search results
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedResults = searchResults.slice(startIndex, endIndex);

  res.json({
    tasks: paginatedResults,
    pagination: {
      total: searchResults.length,
      page: parseInt(page),
      pages: Math.ceil(searchResults.length / limit)
    }
  });
};

// Batch operations
exports.batchCreateTasks = async (req, res) => {
  if (!Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Request body must be an array' });
  }

  try {
    const createdTasks = [];
    for (const taskData of req.body) {
      const task = new Task({ id: nextId++, ...taskData });
      task.validate();
      createdTasks.push(task);
    }

    // If all validations pass, save the tasks
    createdTasks.forEach(task => tasks.set(task.id, task));
    res.status(201).json(createdTasks);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.batchUpdateTasks = async (req, res) => {
  if (!Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Request body must be an array' });
  }

  try {
    const updatedTasks = [];
    const errors = [];

    for (const updateData of req.body) {
      if (!updateData.id) {
        errors.push({ error: 'Task ID is required for updates', data: updateData });
        continue;
      }

      const task = tasks.get(updateData.id);
      if (!task) {
        errors.push({ error: `Task with ID ${updateData.id} not found`, data: updateData });
        continue;
      }

      // Validate status transition
      if (updateData.status && !task.canTransitionTo(updateData.status)) {
        errors.push({ error: `Invalid status transition for task ${updateData.id}`, data: updateData });
        continue;
      }

      // Create a copy to validate without affecting original
      const taskCopy = new Task({ ...task, ...updateData });
      taskCopy.validate();
      
      task.update(updateData);
      updatedTasks.push(task);
    }

    if (errors.length > 0) {
      return res.status(400).json({ 
        error: 'Some updates failed', 
        errors,
        successfulUpdates: updatedTasks.length
      });
    }

    res.json(updatedTasks);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.batchDeleteTasks = async (req, res) => {
  if (!Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Request body must be an array of task IDs' });
  }

  try {
    const deletedIds = [];
    const errors = [];

    for (const taskId of req.body) {
      if (!tasks.has(taskId)) {
        errors.push({ error: `Task with ID ${taskId} not found`, id: taskId });
        continue;
      }

      // Check if task is a dependency for other tasks
      const dependentTasks = Array.from(tasks.values())
        .filter(task => task.dependencies.includes(taskId));

      if (dependentTasks.length > 0) {
        errors.push({ 
          error: `Task ${taskId} has dependencies and cannot be deleted`, 
          id: taskId,
          dependentTasks: dependentTasks.map(t => ({ id: t.id, title: t.title }))
        });
        continue;
      }

      tasks.delete(taskId);
      deletedIds.push(taskId);
    }

    if (errors.length > 0) {
      return res.status(400).json({ 
        error: 'Some deletions failed', 
        errors,
        deletedCount: deletedIds.length,
        deletedIds
      });
    }

    res.json({ 
      message: `Successfully deleted ${deletedIds.length} tasks`,
      deletedIds 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Analytics endpoints
exports.getCompletionRate = async (req, res) => {
  const allTasks = Array.from(tasks.values());
  if (allTasks.length === 0) {
    return res.json({
      total: 0,
      completed: 0,
      completionRate: '0%'
    });
  }

  const completedTasks = allTasks.filter(task => task.status === TaskStatus.COMPLETED);
  const completionRate = (completedTasks.length / allTasks.length) * 100;
  
  res.json({
    total: allTasks.length,
    completed: completedTasks.length,
    completionRate: `${completionRate.toFixed(2)}%`
  });
};

exports.getAverageCompletionTime = async (req, res) => {
  const completedTasks = Array.from(tasks.values())
    .filter(task => task.status === TaskStatus.COMPLETED);

  if (completedTasks.length === 0) {
    return res.json({
      averageCompletionTime: '0 days',
      totalTasksCompleted: 0
    });
  }

  const completionTimes = completedTasks.map(task => {
    const createdDate = new Date(task.createdAt);
    const completedDate = new Date(task.updatedAt);
    return differenceInDays(completedDate, createdDate);
  });

  const averageTime = completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length;

  res.json({
    averageCompletionTime: `${averageTime.toFixed(1)} days`,
    totalTasksCompleted: completedTasks.length
  });
};

exports.getPopularTags = async (req, res) => {
  const tagCount = new Map();
  
  Array.from(tasks.values()).forEach(task => {
    task.tags.forEach(tag => {
      tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
    });
  });

  const sortedTags = Array.from(tagCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  res.json(sortedTags);
};
