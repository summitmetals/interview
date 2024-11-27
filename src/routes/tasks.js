const express = require('express');
const router = express.Router();
const { validateTask, validateTaskUpdate, validateStatusTransition, validateBatchUpdate } = require('../middleware/validation');
const taskController = require('../controllers/tasks');

// Create task
router.post('/', validateTask, taskController.createTask);

// Get all tasks with filtering, sorting, and pagination
router.get('/', taskController.getTasks);

// Get task by ID
router.get("/:id", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id, 10); // Extract task ID from request params
      const task = await taskController.getTaskById(taskId); // Retrieve the task by ID
  
      if (!task) {
        return res.status(404).json({ error: "Task not found" }); // Return 404 if task not found
      }
  
      res.status(200).json(task); // Send the task back in the response
    } catch (error) {
      console.error("Error fetching task:", error); // Log error if it occurs
      res
        .status(500)
        .json({ error: "Internal Server Error", message: error.message });
    }
  });

// Update task
router.put(
    "/:id",
    async (req, res, next) => {
      try {
        const taskId = parseInt(req.params.id, 10); // Extract task ID from the URL
        const task = await taskController.getTaskById(taskId); // Fetch the task
  
        if (!task) {
          return res.status(404).json({ error: "Task not found" });
        }
  
        req.task = task; // Attach the task to the request object
        next(); // Continue to the next middleware (validate and update)
      } catch (error) {
        console.error("Error retrieving task:", error);
        return res
          .status(500)
          .json({ error: "Internal Server Error", message: error.message });
      }
    },
    validateTaskUpdate,
    validateStatusTransition,
    taskController.updateTask
  );

// Delete task
router.delete('/:id', taskController.deleteTask);

// Search tasks
router.get('/search', taskController.searchTasks);

// Batch operations
router.post('/batch', taskController.batchCreateTasks);
router.put('/batch', validateBatchUpdate, taskController.batchUpdateTasks);
router.delete('/batch', taskController.batchDeleteTasks);

// Analytics endpoints
router.get('/analytics/completion-rate', taskController.getCompletionRate);
router.get('/analytics/average-completion-time', taskController.getAverageCompletionTime);
router.get('/analytics/popular-tags', taskController.getPopularTags);

module.exports = router;
