const express = require('express');
const router = express.Router();
const { validateTask, validateStatusTransition, validateQueryParams } = require('../middleware/validation');
const taskController = require('../controllers/tasks');

/**
 * @swagger
 * /tasks/analytics/completion-rate:
 *   get:
 *     summary: Get task completion rate statistics
 *     description: Returns the overall completion rate of all tasks in the system
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Completion rate statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompletionRateResponse'
 *             example:
 *               total: 100
 *               completed: 75
 *               completionRate: "75.00%"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/analytics/completion-rate', taskController.getCompletionRate);

/**
 * @swagger
 * /tasks/analytics/average-completion-time:
 *   get:
 *     summary: Get average task completion time
 *     description: Returns the average time it takes to complete tasks
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Average completion time statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AverageCompletionTimeResponse'
 *             example:
 *               averageCompletionTime: "3.5 days"
 *               totalTasksCompleted: 45
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/analytics/average-completion-time', taskController.getAverageCompletionTime);

/**
 * @swagger
 * /tasks/analytics/popular-tags:
 *   get:
 *     summary: Get most popular tags
 *     description: Returns a list of the most frequently used tags across all tasks
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: List of popular tags with usage counts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PopularTag'
 *             example:
 *               - tag: "urgent"
 *                 count: 25
 *               - tag: "documentation"
 *                 count: 18
 *               - tag: "bug"
 *                 count: 12
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/analytics/popular-tags', taskController.getPopularTags);

/**
 * @swagger
 * /tasks/search:
 *   get:
 *     summary: Search tasks by title or description
 *     description: Performs a case-insensitive search across task titles and descriptions
 *     tags: [Tasks]
 *     parameters:
 *       - $ref: '#/components/parameters/SearchQuery'
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *     responses:
 *       200:
 *         description: Search results with pagination
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TasksResponse'
 *             example:
 *               tasks:
 *                 - id: 1
 *                   title: "Complete project documentation"
 *                   description: "Write comprehensive API documentation"
 *                   dueDate: "2024-12-31T23:59:59.000Z"
 *                   status: "pending"
 *                   priority: "high"
 *                   tags: ["documentation", "urgent"]
 *                   dependencies: []
 *                   createdAt: "2024-01-15T10:30:00.000Z"
 *                   updatedAt: "2024-01-15T10:30:00.000Z"
 *               pagination:
 *                 total: 1
 *                 page: 1
 *                 pages: 1
 *       400:
 *         description: Missing or invalid search query
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Search query is required"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/search', taskController.searchTasks);

/**
 * @swagger
 * /tasks/batch:
 *   post:
 *     summary: Create multiple tasks
 *     description: Creates multiple tasks atomically. If any task fails validation, no tasks are created.
 *     tags: [Batch Operations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/CreateTaskRequest'
 *           example:
 *             - title: "Task 1"
 *               description: "First task description"
 *               dueDate: "2024-12-31"
 *               priority: "high"
 *               tags: ["batch", "urgent"]
 *             - title: "Task 2"
 *               description: "Second task description"
 *               dueDate: "2024-11-30"
 *               priority: "medium"
 *               tags: ["batch", "normal"]
 *     responses:
 *       201:
 *         description: All tasks created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/batch', taskController.batchCreateTasks);

/**
 * @swagger
 * /tasks/batch:
 *   put:
 *     summary: Update multiple tasks
 *     description: Updates multiple tasks. Continues processing even if some updates fail, returning details about successes and failures.
 *     tags: [Batch Operations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/BatchUpdateRequest'
 *           example:
 *             - id: 1
 *               status: "in-progress"
 *               priority: "high"
 *             - id: 2
 *               title: "Updated Task Title"
 *               tags: ["updated", "modified"]
 *     responses:
 *       200:
 *         description: Batch update completed (may include partial failures)
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: array
 *                   items:
 *                     $ref: '#/components/schemas/Task'
 *                 - type: object
 *                   properties:
 *                     error:
 *                       type: string
 *                       example: "Some updates failed"
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *                     successfulUpdates:
 *                       type: integer
 *                       example: 5
 *       400:
 *         description: Invalid request format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Request body must be an array"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/batch', taskController.batchUpdateTasks);

/**
 * @swagger
 * /tasks/batch:
 *   delete:
 *     summary: Delete multiple tasks
 *     description: Deletes multiple tasks by their IDs. Continues processing even if some deletions fail.
 *     tags: [Batch Operations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: integer
 *           example: [1, 2, 3, 4, 5]
 *     responses:
 *       200:
 *         description: Batch deletion completed
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Successfully deleted 5 tasks"
 *                     deletedIds:
 *                       type: array
 *                       items:
 *                         type: integer
 *                       example: [1, 2, 3, 4, 5]
 *                 - type: object
 *                   properties:
 *                     error:
 *                       type: string
 *                       example: "Some deletions failed"
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *                     deletedCount:
 *                       type: integer
 *                       example: 3
 *                     deletedIds:
 *                       type: array
 *                       items:
 *                         type: integer
 *                       example: [1, 2, 3]
 *       400:
 *         description: Invalid request format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Request body must be an array of task IDs"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/batch', taskController.batchDeleteTasks);

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Get all tasks with filtering, sorting, and pagination
 *     description: |
 *       Retrieves tasks with comprehensive filtering, sorting, and pagination options.
 *       
 *       **Filtering Options:**
 *       - Filter by status, priority, due date range, or tags
 *       - Multiple filters can be combined
 *       - Tags can be provided as comma-separated values
 *       
 *       **Sorting Options:**
 *       - Sort by due date, priority, or creation date
 *       - Ascending or descending order
 *       - Priority sorting: low < medium < high
 *       
 *       **Pagination:**
 *       - Configurable page size (1-100 items)
 *       - Zero-based page numbering
 *     tags: [Tasks]
 *     parameters:
 *       - $ref: '#/components/parameters/StatusFilter'
 *       - $ref: '#/components/parameters/PriorityFilter'
 *       - $ref: '#/components/parameters/DueDateStart'
 *       - $ref: '#/components/parameters/DueDateEnd'
 *       - $ref: '#/components/parameters/TagsFilter'
 *       - $ref: '#/components/parameters/SortBy'
 *       - $ref: '#/components/parameters/SortOrder'
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *     responses:
 *       200:
 *         description: List of tasks with pagination information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TasksResponse'
 *             example:
 *               tasks:
 *                 - id: 1
 *                   title: "Complete project documentation"
 *                   description: "Write comprehensive API documentation"
 *                   dueDate: "2024-12-31T23:59:59.000Z"
 *                   status: "pending"
 *                   priority: "high"
 *                   tags: ["documentation", "urgent"]
 *                   dependencies: []
 *                   createdAt: "2024-01-15T10:30:00.000Z"
 *                   updatedAt: "2024-01-15T10:30:00.000Z"
 *               pagination:
 *                 total: 25
 *                 page: 1
 *                 pages: 3
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/', validateQueryParams, taskController.getTasks);

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Create a new task
 *     description: |
 *       Creates a new task with the specified properties.
 *       
 *       **Business Rules:**
 *       - Title and description are required
 *       - Due date cannot be in the past (today is allowed)
 *       - At least one tag is required
 *       - Status defaults to 'pending'
 *       - Priority defaults to 'medium'
 *       - Dependencies must reference existing tasks
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTaskRequest'
 *           example:
 *             title: "Complete project documentation"
 *             description: "Write comprehensive API documentation with examples and usage instructions"
 *             dueDate: "2024-12-31"
 *             priority: "high"
 *             tags: ["documentation", "urgent", "api"]
 *             dependencies: [2, 3]
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *             example:
 *               id: 1
 *               title: "Complete project documentation"
 *               description: "Write comprehensive API documentation with examples and usage instructions"
 *               dueDate: "2024-12-31T00:00:00.000Z"
 *               status: "pending"
 *               priority: "high"
 *               tags: ["documentation", "urgent", "api"]
 *               dependencies: [2, 3]
 *               createdAt: "2024-01-15T10:30:00.000Z"
 *               updatedAt: "2024-01-15T10:30:00.000Z"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/', validateTask, taskController.createTask);

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Get a specific task by ID
 *     description: Retrieves a single task by its unique identifier
 *     tags: [Tasks]
 *     parameters:
 *       - $ref: '#/components/parameters/TaskId'
 *     responses:
 *       200:
 *         description: Task found and returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *             example:
 *               id: 1
 *               title: "Complete project documentation"
 *               description: "Write comprehensive API documentation"
 *               dueDate: "2024-12-31T23:59:59.000Z"
 *               status: "in-progress"
 *               priority: "high"
 *               tags: ["documentation", "urgent"]
 *               dependencies: []
 *               createdAt: "2024-01-15T10:30:00.000Z"
 *               updatedAt: "2024-01-16T14:20:00.000Z"
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:id', taskController.getTaskById);

/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     summary: Update an existing task
 *     description: |
 *       Updates an existing task with new values. Only provided fields will be updated.
 *       
 *       **Status Transition Rules:**
 *       - pending → in-progress
 *       - in-progress → completed
 *       - completed → archived
 *       - Cannot skip states or move backwards
 *       
 *       **Additional Rules:**
 *       - High priority tasks must be completed before archiving
 *       - Dependencies must be completed before marking task as completed
 *       - Due date cannot be changed to a past date
 *     tags: [Tasks]
 *     parameters:
 *       - $ref: '#/components/parameters/TaskId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTaskRequest'
 *           example:
 *             status: "in-progress"
 *             priority: "high"
 *             tags: ["documentation", "updated", "urgent"]
 *     responses:
 *       200:
 *         description: Task updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *             example:
 *               id: 1
 *               title: "Complete project documentation"
 *               description: "Write comprehensive API documentation"
 *               dueDate: "2024-12-31T23:59:59.000Z"
 *               status: "in-progress"
 *               priority: "high"
 *               tags: ["documentation", "updated", "urgent"]
 *               dependencies: []
 *               createdAt: "2024-01-15T10:30:00.000Z"
 *               updatedAt: "2024-01-16T14:20:00.000Z"
 *       400:
 *         description: Validation error or invalid status transition
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ValidationError'
 *                 - type: object
 *                   properties:
 *                     error:
 *                       type: string
 *                       example: "Invalid status transition"
 *                 - type: object
 *                   properties:
 *                     error:
 *                       type: string
 *                       example: "Dependencies not completed"
 *                     message:
 *                       type: string
 *                       example: "All dependencies must be completed before marking task as completed"
 *                     incompleteDependencies:
 *                       type: array
 *                       items:
 *                         type: integer
 *                       example: [2, 3]
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/:id', validateTask, validateStatusTransition, taskController.updateTask);

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     description: |
 *       Deletes a task by its ID. 
 *       
 *       **Constraints:**
 *       - Cannot delete a task that is a dependency for other tasks
 *       - All dependent tasks must be updated or deleted first
 *     tags: [Tasks]
 *     parameters:
 *       - $ref: '#/components/parameters/TaskId'
 *     responses:
 *       204:
 *         description: Task deleted successfully (no content returned)
 *       400:
 *         description: Task cannot be deleted due to dependencies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Task has dependencies"
 *                 message:
 *                   type: string
 *                   example: "Cannot delete task that is a dependency for other tasks"
 *                 dependentTasks:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                   example:
 *                     - id: 5
 *                       title: "Review documentation"
 *                     - id: 6
 *                       title: "Deploy to production"
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/:id', taskController.deleteTask);

module.exports = router;
