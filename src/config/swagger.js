const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Task Management System API',
      version: '1.0.0',
      description: `
A comprehensive task management system with advanced features including:
- Complete CRUD operations for tasks
- Task dependencies with cycle detection
- Status transitions with business rules
- Batch operations
- Advanced filtering and search
- Analytics and reporting

## Business Rules
- Tasks cannot have due dates in the past
- Status transitions must follow: pending → in-progress → completed → archived
- High priority tasks must be completed before archiving
- Tasks must have at least one tag
- Dependencies must be completed before marking a task as completed

## Features
- **Filtering**: By status, priority, due date range, tags
- **Sorting**: By due date, priority, creation date
- **Pagination**: Configurable page size with limits
- **Search**: Full-text search in title and description
- **Batch Operations**: Create, update, delete multiple tasks atomically
- **Analytics**: Completion rates, average times, popular tags
      `,
      contact: {
        name: 'Summit Metals',
        email: 'patrickroach@summitmetals.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server'
      }
    ],
    tags: [
      {
        name: 'Tasks',
        description: 'Task management operations - Create, read, update, delete tasks'
      },
      {
        name: 'Analytics',
        description: 'Task analytics and reporting - Completion rates, popular tags, statistics'
      },
      {
        name: 'Batch Operations',
        description: 'Bulk operations for managing multiple tasks atomically'
      }
    ],
    components: {
      schemas: {
        Task: {
          type: 'object',
          required: ['id', 'title', 'description', 'dueDate', 'status', 'priority', 'tags', 'createdAt', 'updatedAt'],
          properties: {
            id: {
              type: 'integer',
              description: 'Unique task identifier',
              example: 1
            },
            title: {
              type: 'string',
              description: 'Task title',
              example: 'Complete project documentation'
            },
            description: {
              type: 'string',
              description: 'Detailed task description',
              example: 'Write comprehensive API documentation with examples'
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
              description: 'Task due date (ISO 8601 format)',
              example: '2024-12-31T23:59:59.000Z'
            },
            status: {
              type: 'string',
              enum: ['pending', 'in-progress', 'completed', 'archived'],
              description: 'Current task status',
              example: 'pending'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Task priority level',
              example: 'high'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              minItems: 1,
              description: 'Task tags (at least one required)',
              example: ['documentation', 'urgent', 'api']
            },
            dependencies: {
              type: 'array',
              items: {
                type: 'integer'
              },
              description: 'Array of task IDs this task depends on',
              example: [2, 3]
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Task creation timestamp',
              example: '2024-01-15T10:30:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
              example: '2024-01-16T14:20:00.000Z'
            }
          }
        },
        CreateTaskRequest: {
          type: 'object',
          required: ['title', 'description', 'dueDate', 'tags'],
          properties: {
            title: {
              type: 'string',
              minLength: 1,
              description: 'Task title (required)',
              example: 'Complete project documentation'
            },
            description: {
              type: 'string',
              minLength: 1,
              description: 'Detailed task description (required)',
              example: 'Write comprehensive API documentation with examples and usage instructions'
            },
            dueDate: {
              type: 'string',
              format: 'date',
              description: 'Task due date (cannot be in the past)',
              example: '2024-12-31'
            },
            status: {
              type: 'string',
              enum: ['pending', 'in-progress', 'completed', 'archived'],
              default: 'pending',
              description: 'Initial task status',
              example: 'pending'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              default: 'medium',
              description: 'Task priority level',
              example: 'high'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              minItems: 1,
              description: 'Task tags (at least one required)',
              example: ['documentation', 'urgent']
            },
            dependencies: {
              type: 'array',
              items: {
                type: 'integer'
              },
              default: [],
              description: 'Array of task IDs this task depends on',
              example: [2, 3]
            }
          }
        },
        UpdateTaskRequest: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              minLength: 1,
              description: 'Updated task title',
              example: 'Complete project documentation (Updated)'
            },
            description: {
              type: 'string',
              minLength: 1,
              description: 'Updated task description',
              example: 'Write comprehensive API documentation with examples'
            },
            dueDate: {
              type: 'string',
              format: 'date',
              description: 'Updated due date (cannot be in the past)',
              example: '2024-12-31'
            },
            status: {
              type: 'string',
              enum: ['pending', 'in-progress', 'completed', 'archived'],
              description: 'Updated task status (must follow valid transitions)',
              example: 'in-progress'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Updated task priority',
              example: 'high'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              minItems: 1,
              description: 'Updated task tags (at least one required)',
              example: ['documentation', 'updated']
            },
            dependencies: {
              type: 'array',
              items: {
                type: 'integer'
              },
              description: 'Updated dependencies (cannot create cycles)',
              example: [2]
            }
          }
        },
        BatchUpdateRequest: {
          allOf: [
            {
              type: 'object',
              required: ['id'],
              properties: {
                id: {
                  type: 'integer',
                  description: 'Task ID to update',
                  example: 1
                }
              }
            },
            {
              $ref: '#/components/schemas/UpdateTaskRequest'
            }
          ]
        },
        Pagination: {
          type: 'object',
          properties: {
            total: {
              type: 'integer',
              description: 'Total number of items',
              example: 25
            },
            page: {
              type: 'integer',
              description: 'Current page number',
              example: 1
            },
            pages: {
              type: 'integer',
              description: 'Total number of pages',
              example: 3
            }
          }
        },
        TasksResponse: {
          type: 'object',
          properties: {
            tasks: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Task'
              }
            },
            pagination: {
              $ref: '#/components/schemas/Pagination'
            }
          }
        },
        CompletionRateResponse: {
          type: 'object',
          properties: {
            total: {
              type: 'integer',
              description: 'Total number of tasks',
              example: 100
            },
            completed: {
              type: 'integer',
              description: 'Number of completed tasks',
              example: 75
            },
            completionRate: {
              type: 'string',
              description: 'Completion rate as percentage',
              example: '75.00%'
            }
          }
        },
        AverageCompletionTimeResponse: {
          type: 'object',
          properties: {
            averageCompletionTime: {
              type: 'string',
              description: 'Average time to complete tasks',
              example: '3.5 days'
            },
            totalTasksCompleted: {
              type: 'integer',
              description: 'Total number of completed tasks',
              example: 45
            }
          }
        },
        PopularTag: {
          type: 'object',
          properties: {
            tag: {
              type: 'string',
              description: 'Tag name',
              example: 'urgent'
            },
            count: {
              type: 'integer',
              description: 'Number of tasks with this tag',
              example: 15
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
              example: 'Validation Error'
            },
            details: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Detailed error messages',
              example: ['Title is required', 'Due date cannot be in the past']
            }
          }
        },
        ValidationError: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              example: 'Validation Error'
            },
            details: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['\"title\" is required', '\"dueDate\" must be greater than \"now\"']
            }
          }
        }
      },
      parameters: {
        TaskId: {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'integer',
            minimum: 1
          },
          description: 'Task ID',
          example: 1
        },
        StatusFilter: {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['pending', 'in-progress', 'completed', 'archived']
          },
          description: 'Filter tasks by status',
          example: 'pending'
        },
        PriorityFilter: {
          name: 'priority',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['low', 'medium', 'high']
          },
          description: 'Filter tasks by priority',
          example: 'high'
        },
        DueDateStart: {
          name: 'dueDateStart',
          in: 'query',
          schema: {
            type: 'string',
            format: 'date'
          },
          description: 'Filter tasks due after this date',
          example: '2024-01-01'
        },
        DueDateEnd: {
          name: 'dueDateEnd',
          in: 'query',
          schema: {
            type: 'string',
            format: 'date'
          },
          description: 'Filter tasks due before this date',
          example: '2024-12-31'
        },
        TagsFilter: {
          name: 'tags',
          in: 'query',
          schema: {
            type: 'string'
          },
          description: 'Filter tasks by tags (comma-separated)',
          example: 'urgent,documentation'
        },
        SortBy: {
          name: 'sortBy',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['dueDate', 'priority', 'createdAt']
          },
          description: 'Sort tasks by field',
          example: 'dueDate'
        },
        SortOrder: {
          name: 'sortOrder',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['asc', 'desc']
          },
          description: 'Sort order',
          example: 'asc'
        },
        Page: {
          name: 'page',
          in: 'query',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1
          },
          description: 'Page number for pagination',
          example: 1
        },
        Limit: {
          name: 'limit',
          in: 'query',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 10
          },
          description: 'Number of items per page',
          example: 10
        },
        SearchQuery: {
          name: 'query',
          in: 'query',
          required: true,
          schema: {
            type: 'string',
            minLength: 1
          },
          description: 'Search query for title or description',
          example: 'documentation'
        }
      },
      responses: {
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ValidationError'
              }
            }
          }
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: {
                    type: 'string',
                    example: 'Task not found'
                  }
                }
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: {
                    type: 'string',
                    example: 'Internal Server Error'
                  },
                  message: {
                    type: 'string',
                    example: 'Something went wrong'
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js'], // Path to the API routes
};

const specs = swaggerJsdoc(options);

module.exports = specs; 