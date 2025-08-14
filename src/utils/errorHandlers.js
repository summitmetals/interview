class ApiError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'ApiError';
  }
}

class ValidationError extends ApiError {
  constructor(message, details = null) {
    super(message, 400, details);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends ApiError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends ApiError {
  constructor(message) {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

const handleAsyncError = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.details
    });
  }

  // Handle Joi validation errors
  if (err.name === 'ValidationError' && err.details) {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.details.map(detail => detail.message)
    });
  }

  // Default error
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
};

module.exports = {
  ApiError,
  ValidationError,
  NotFoundError,
  ConflictError,
  handleAsyncError,
  errorHandler
}; 