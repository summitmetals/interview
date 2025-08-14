const Joi = require('joi');
const { TaskStatus, TaskPriority, VALID_STATUS_TRANSITIONS } = require('../models/task');

const taskSchema = Joi.object({
  title: Joi.string().required().trim(),
  description: Joi.string().required().trim(),
  dueDate: Joi.date().greater('now').required(),
  status: Joi.string().valid(...Object.values(TaskStatus)).default(TaskStatus.PENDING),
  priority: Joi.string().valid(...Object.values(TaskPriority)).default(TaskPriority.MEDIUM),
  tags: Joi.array().items(Joi.string()).min(1).required(),
  dependencies: Joi.array().items(Joi.number()).default([])
});

const updateTaskSchema = Joi.object({
  title: Joi.string().trim(),
  description: Joi.string().trim(),
  dueDate: Joi.date().greater('now'),
  status: Joi.string().valid(...Object.values(TaskStatus)),
  priority: Joi.string().valid(...Object.values(TaskPriority)),
  tags: Joi.array().items(Joi.string()).min(1),
  dependencies: Joi.array().items(Joi.number())
});

exports.validateTask = (req, res, next) => {
  const schema = req.method === 'POST' ? taskSchema : updateTaskSchema;
  const { error } = schema.validate(req.body, { abortEarly: false });
  
  if (error) {
    return res.status(400).json({
      error: 'Validation Error',
      details: error.details.map(detail => detail.message)
    });
  }

  next();
};

exports.validateStatusTransition = (req, res, next) => {
  // This middleware is used for updates, so we need to get the current task
  const taskId = parseInt(req.params.id);
  
  // We'll need to access tasks from the controller - let's modify this approach
  // For now, we'll let the controller handle status transition validation
  next();
};

// Validation for query parameters
exports.validateQueryParams = (req, res, next) => {
  const querySchema = Joi.object({
    status: Joi.string().valid(...Object.values(TaskStatus)),
    priority: Joi.string().valid(...Object.values(TaskPriority)),
    dueDateStart: Joi.date(),
    dueDateEnd: Joi.date().greater(Joi.ref('dueDateStart')),
    tags: Joi.alternatives().try(
      Joi.string(),
      Joi.array().items(Joi.string())
    ),
    sortBy: Joi.string().valid('dueDate', 'priority', 'createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    query: Joi.string() // For search functionality
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
