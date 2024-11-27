const Joi = require('joi');
const { TaskStatus, TaskPriority, VALID_STATUS_TRANSITIONS } = require('../models/task');

const taskSchema = Joi.object({
  title: Joi.string().required().trim(),
  description: Joi.string().required().trim(),
  dueDate: Joi.date().greater('now').required(),
  status: Joi.string().valid(...Object.values(TaskStatus)).default(TaskStatus.PENDING),
  priority: Joi.string().valid(...Object.values(TaskPriority)).default(TaskPriority.MEDIUM),
  tags: Joi.array().items(Joi.string()).min(1).required(),
  dependencies: Joi.array().items(Joi.string()).default([])
});

const updateTaskSchema = Joi.object({
  title: Joi.string().trim(),
  description: Joi.string().trim(),
  dueDate: Joi.date().greater("now"),
  status: Joi.string().valid(...Object.values(TaskStatus)),
  priority: Joi.string().valid(...Object.values(TaskPriority)),
  tags: Joi.array().items(Joi.string()),
});

const batchUpdateSchema = Joi.array().items(
  Joi.object({
    id: Joi.number().integer().required(), // Ensure `id` is a valid integer
    title: Joi.string().optional(),
    description: Joi.string().optional(),
    status: Joi.string()
      .valid('pending', 'in-progress', 'completed', 'archived')
      .optional(),
    priority: Joi.string().valid('low', 'medium', 'high').optional(),
    tags: Joi.array().items(Joi.string()).optional(),
  })
);

exports.validateTask = (req, res, next) => {
  const { error } = taskSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    return res.status(400).json({
      error: 'Validation Error',
      details: error.details.map(detail => detail.message)
    });
  }

  next();
};

exports.validateTaskUpdate = (req, res, next) => {
  const { error } = updateTaskSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      error: "Validation Error",
      details: error.details.map((detail) => detail.message),
    });
  }
  next();
};

exports.validateStatusTransition = (req, res, next) => {
  const { status: currentStatus } = req.task;
  const { status: newStatus } = req.body;

  if (!newStatus) {
    return next();
  }

  const validTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
  if (!validTransitions.includes(newStatus)) {
    return res.status(400).json({
      error: 'Invalid Status Transition',
      message: `Cannot transition from ${currentStatus} to ${newStatus}`
    });
  }

  // Check if dependencies are completed when transitioning to completed
  if (newStatus === TaskStatus.COMPLETED) {
    const incompleteDependencies = req.task.dependencies.filter(
      depId => !tasks.get(depId) || tasks.get(depId).status !== TaskStatus.COMPLETED
    );

    if (incompleteDependencies.length > 0) {
      return res.status(400).json({
        error: 'Dependencies Not Completed',
        message: 'All dependencies must be completed before marking task as completed'
      });
    }
  }

  next();
};

exports.validateBatchUpdate = (req, res, next) => {
  console.log("Validating request body in middleware:", req.body); // Log the request body
  const { error } = batchUpdateSchema.validate(req.body, { abortEarly: false });

  if (error) {
    console.error("Validation error details:", error.details); // Log detailed validation errors
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map((detail) => detail.message),
    });
  }

  console.log("Validation passed for batch update."); // Log success
  next();
};


// Validation for query parameters
exports.validateQueryParams = (req, res, next) => {
  const querySchema = Joi.object({
    status: Joi.string().valid(...Object.values(TaskStatus)),
    priority: Joi.string().valid(...Object.values(TaskPriority)),
    dueDateStart: Joi.date(),
    dueDateEnd: Joi.date().greater(Joi.ref('dueDateStart')),
    tags: Joi.array().items(Joi.string()),
    sortBy: Joi.string().valid('dueDate', 'priority', 'createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100)
  });

  const { error } = querySchema.validate(req.query, { abortEarly: false });
  
  if (error) {
    return res.status(400).json({
      error: 'Invalid Query Parameters',
      details: error.details.map(detail => detail.message)
    });
  }

  next();
};
