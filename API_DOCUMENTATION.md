# Task Management System - API Documentation

## 📚 Interactive Documentation

Visit the **interactive Swagger UI documentation** at:
```
http://localhost:3000/api-docs
```

This provides a complete, interactive interface where you can:
- Explore all endpoints and their parameters
- Test API calls directly from the browser
- View request/response schemas and examples
- Understand business rules and constraints

## 🚀 Quick Start

### 1. Start the Server
```bash
npm run dev
```

### 2. Access Documentation
- **Interactive Docs**: http://localhost:3000/api-docs
- **API Base URL**: http://localhost:3000/api
- **Welcome Page**: http://localhost:3000/

## 📖 API Overview

### Base URL
```
http://localhost:3000/api
```

### Content Type
All requests and responses use `application/json`.

### Error Handling
All errors follow a consistent format:
```json
{
  "error": "Error Type",
  "details": ["Detailed error message 1", "Detailed error message 2"]
}
```

## 🔗 Endpoint Categories

### 1. Tasks (`/tasks`)
Core task management operations:
- `GET /tasks` - List tasks with filtering, sorting, pagination
- `POST /tasks` - Create a new task
- `GET /tasks/{id}` - Get specific task
- `PUT /tasks/{id}` - Update task
- `DELETE /tasks/{id}` - Delete task

### 2. Search (`/tasks/search`)
- `GET /tasks/search?query=...` - Search tasks by title/description

### 3. Analytics (`/tasks/analytics/`)
- `GET /tasks/analytics/completion-rate` - Task completion statistics
- `GET /tasks/analytics/average-completion-time` - Time-to-complete metrics
- `GET /tasks/analytics/popular-tags` - Most used tags

### 4. Batch Operations (`/tasks/batch`)
- `POST /tasks/batch` - Create multiple tasks
- `PUT /tasks/batch` - Update multiple tasks
- `DELETE /tasks/batch` - Delete multiple tasks

## 💡 Usage Examples

### Create a Task
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Complete API documentation",
    "description": "Write comprehensive documentation with examples",
    "dueDate": "2024-12-31",
    "priority": "high",
    "tags": ["documentation", "urgent"]
  }'
```

### Get Tasks with Filters
```bash
# Get high-priority pending tasks
curl "http://localhost:3000/api/tasks?status=pending&priority=high&sortBy=dueDate&sortOrder=asc"

# Get tasks with specific tags
curl "http://localhost:3000/api/tasks?tags=urgent,documentation&limit=5"
```

### Update Task Status
```bash
curl -X PUT http://localhost:3000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "in-progress"}'
```

### Search Tasks
```bash
curl "http://localhost:3000/api/tasks/search?query=documentation&page=1&limit=10"
```

### Batch Create Tasks
```bash
curl -X POST http://localhost:3000/api/tasks/batch \
  -H "Content-Type: application/json" \
  -d '[
    {
      "title": "Task 1",
      "description": "First batch task",
      "dueDate": "2024-12-31",
      "tags": ["batch", "urgent"]
    },
    {
      "title": "Task 2", 
      "description": "Second batch task",
      "dueDate": "2024-11-30",
      "tags": ["batch", "normal"]
    }
  ]'
```

### Get Analytics
```bash
# Completion rate
curl "http://localhost:3000/api/tasks/analytics/completion-rate"

# Popular tags
curl "http://localhost:3000/api/tasks/analytics/popular-tags"
```

## 📋 Business Rules

### Task Creation
- **Title**: Required, non-empty string
- **Description**: Required, non-empty string
- **Due Date**: Cannot be in the past (today is allowed)
- **Tags**: At least one tag required
- **Status**: Defaults to `pending`
- **Priority**: Defaults to `medium`

### Status Transitions
Tasks follow a strict state machine:
```
pending → in-progress → completed → archived
```
- Cannot skip states
- Cannot move backwards
- High priority tasks must be completed before archiving

### Dependencies
- Tasks can depend on other existing tasks
- Circular dependencies are prevented
- Dependencies must be completed before marking a task as completed
- Cannot delete tasks that other tasks depend on

### Validation Rules
- **Status**: `pending`, `in-progress`, `completed`, `archived`
- **Priority**: `low`, `medium`, `high`
- **Tags**: Array of strings, minimum 1 item
- **Dependencies**: Array of valid task IDs

## 🔍 Filtering & Sorting

### Available Filters
- `status` - Filter by task status
- `priority` - Filter by priority level
- `dueDateStart` - Tasks due after this date
- `dueDateEnd` - Tasks due before this date
- `tags` - Filter by tags (comma-separated)

### Sorting Options
- `sortBy` - Field to sort by: `dueDate`, `priority`, `createdAt`
- `sortOrder` - Order: `asc` or `desc`

### Pagination
- `page` - Page number (starts at 1)
- `limit` - Items per page (1-100, default: 10)

### Example Query
```
GET /tasks?status=pending&priority=high&tags=urgent,documentation&sortBy=dueDate&sortOrder=asc&page=1&limit=20
```

## 📊 Response Formats

### Task Object
```json
{
  "id": 1,
  "title": "Complete project documentation",
  "description": "Write comprehensive API documentation",
  "dueDate": "2024-12-31T23:59:59.000Z",
  "status": "pending",
  "priority": "high",
  "tags": ["documentation", "urgent"],
  "dependencies": [2, 3],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### Paginated Response
```json
{
  "tasks": [/* array of task objects */],
  "pagination": {
    "total": 25,
    "page": 1,
    "pages": 3
  }
}
```

### Error Response
```json
{
  "error": "Validation Error",
  "details": [
    "\"title\" is required",
    "\"dueDate\" must be greater than \"now\""
  ]
}
```

## 🚨 Error Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 400 | Bad Request | Validation errors, invalid transitions |
| 404 | Not Found | Task doesn't exist |
| 500 | Internal Server Error | Server-side issues |

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Test Endpoints
Use the interactive Swagger UI at `/api-docs` to test all endpoints with real data.

## 📚 Additional Resources

- **Interactive API Docs**: http://localhost:3000/api-docs
- **Source Code**: Check the `src/` directory
- **Solution Documentation**: See `SOLUTION.md`
- **OpenAPI Spec**: `api-docs.yaml`

## 💬 Support

For questions or issues, contact: patrickroach@summitmetals.com 