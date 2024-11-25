const express = require('express');
const router = express.Router();
const { validateTask, validateStatusTransition } = require('../middleware/validation');
const taskController = require('../controllers/tasks');

// Create task
router.post('/', validateTask, taskController.createTask);

// Get all tasks with filtering, sorting, and pagination
router.get('/', taskController.getTasks);

// Get task by ID
router.get('/:id', taskController.getTaskById);

// Update task
router.put('/:id', validateTask, validateStatusTransition, taskController.updateTask);

// Delete task
router.delete('/:id', taskController.deleteTask);

// Search tasks
router.get('/search', taskController.searchTasks);

// Batch operations
router.post('/batch', taskController.batchCreateTasks);
router.put('/batch', taskController.batchUpdateTasks);
router.delete('/batch', taskController.batchDeleteTasks);

// Analytics endpoints
router.get('/analytics/completion-rate', taskController.getCompletionRate);
router.get('/analytics/average-completion-time', taskController.getAverageCompletionTime);
router.get('/analytics/popular-tags', taskController.getPopularTags);

module.exports = router;
