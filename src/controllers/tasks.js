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
    return multiplier * (a[sortBy] - b[sortBy]);
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
    let filteredTasks = filterTasks(tasks, req.query);
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

exports.getTaskById = async (taskId) => {
  try {
    const task = tasks.get(taskId);
    if (!task) {
      return null;
    }
    return task;
  } catch (error) {
    console.error('Error fetching task:', error);
    throw new Error('Error while retrieving task.');
  }
};

exports.updateTask = async (req, res) => {
  try {
    const { task } = req; // The task is already retrieved and attached to req in the middleware
    const { status: newStatus, ...updateData } = req.body; // Destructure to get the new status and other fields

    // Check if the status transition is allowed (already handled by middleware)
    if (newStatus) {
      // Only update status if it's provided in the request
      task.status = newStatus;
    }

    // Update other task fields
    Object.assign(task, updateData); // Update the task with the fields provided in the request
    task.validate();

    // If everything is valid, return the updated task
    res.status(200).json(task);
  } catch (error) {
    res
      .status(400)
      .json({ error: "Internal Server Error", message: error.message });
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
      message: 'Cannot delete task that is a dependency for other tasks'
    });
  }

  tasks.delete(taskId);
  res.status(204).send();
};

// Search functionality
exports.searchTasks = async (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const searchResults = Array.from(tasks.values()).filter(task =>
    task.title.toLowerCase().includes(query.toLowerCase()) ||
    task.description.toLowerCase().includes(query.toLowerCase())
  );

  res.json(searchResults);
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
    return res.status(400).json({ error: "Request body must be an array" });
  }

  try {
    const updatedTasks = [];
    for (const taskData of req.body) {
      const task = tasks.get(taskData.id); // Retrieve task by ID
      if (!task) {
        return res
          .status(404)
          .json({ error: `Task with ID ${taskData.id} not found` });
      }

      task.update(taskData); // Update the task with new data
      task.validate(); // Ensure the task is still valid after update
      updatedTasks.push(task);
    }

    res.status(200).json(updatedTasks);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.batchDeleteTasks = async (req, res) => {
  if (!Array.isArray(req.body)) {
    return res.status(400).json({ error: "Request body must be an array" });
  }

  try {
    const deletedTasks = [];
    for (const taskId of req.body) {
      const task = tasks.get(taskId); // Retrieve task by ID
      if (!task) {
        return res
          .status(404)
          .json({ error: `Task with ID ${taskId} not found` });
      }

      // Check for dependencies and ensure the task can be safely deleted
      const dependentTasks = Array.from(tasks.values()).filter(
        (dependentTask) => dependentTask.dependencies.includes(taskId)
      );

      if (dependentTasks.length > 0) {
        return res.status(400).json({
          error: "Task has dependencies",
          message: `Cannot delete task with ID ${taskId} as it has dependent tasks`,
        });
      }

      tasks.delete(taskId); // Delete the task from the map
      deletedTasks.push(task);
    }

    res.status(200).json(deletedTasks); // Return the list of deleted tasks
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Analytics endpoints
exports.getCompletionRate = async (req, res) => {
  const allTasks = Array.from(tasks.values());
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
