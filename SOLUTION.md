# Task Management System - Solution

## How to Run the Solution

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation & Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd summit-interview
```

2. **Install dependencies**
```bash
npm install
```

3. **Create environment file**
```bash
cp .env.example .env
```

4. **Start the development server**
```bash
npm run dev
```

5. **Run tests**
```bash
npm test
```

The API will be available at `http://localhost:3000`

## API Documentation

### Interactive Swagger Documentation
**🎉 NEW: Interactive API Documentation is now available!**

Visit: **http://localhost:3000/api-docs**

The Swagger UI provides:
- Complete interactive API documentation
- Try-it-out functionality for all endpoints
- Detailed request/response schemas with examples
- Business rules and validation constraints
- Organized by endpoint categories (Tasks, Analytics, Batch Operations)

### Base URL
```
http://localhost:3000/api
```

### Core Endpoints

#### Tasks
- `GET /tasks` - Get all tasks with filtering, sorting, and pagination
- `POST /tasks` - Create a new task
- `GET /tasks/:id` - Get a specific task
- `PUT /tasks/:id` - Update a task
- `DELETE /tasks/:id` - Delete a task

#### Search & Analytics
- `GET /tasks/search?query=...` - Search tasks by title/description
- `GET /tasks/analytics/completion-rate` - Get completion statistics
- `GET /tasks/analytics/average-completion-time` - Get average completion time
- `GET /tasks/analytics/popular-tags` - Get most used tags

#### Batch Operations
- `POST /tasks/batch` - Create multiple tasks
- `PUT /tasks/batch` - Update multiple tasks
- `DELETE /tasks/batch` - Delete multiple tasks

### Query Parameters

#### Filtering
- `status` - Filter by task status (pending, in-progress, completed, archived)
- `priority` - Filter by priority (low, medium, high)
- `dueDateStart` - Filter tasks due after this date
- `dueDateEnd` - Filter tasks due before this date
- `tags` - Filter by tags (comma-separated)

#### Sorting
- `sortBy` - Sort by field (dueDate, priority, createdAt)
- `sortOrder` - Sort order (asc, desc)

#### Pagination
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)

### Example Requests

#### Create a Task
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Complete project documentation",
    "description": "Write comprehensive API documentation",
    "dueDate": "2024-12-31",
    "priority": "high",
    "tags": ["documentation", "urgent"]
  }'
```

#### Get Tasks with Filtering
```bash
curl "http://localhost:3000/api/tasks?status=pending&priority=high&sortBy=dueDate&sortOrder=asc"
```

#### Search Tasks
```bash
curl "http://localhost:3000/api/tasks/search?query=documentation"
```

## Implementation Details

### Architecture Decisions

#### 1. **In-Memory Storage**
- Used a `Map` for O(1) task lookups by ID
- Maintained data structure integrity for relationships
- Easy to extend to database storage later

#### 2. **Modular Structure**
- **Models**: Data structures and business logic
- **Controllers**: Request handling and business operations
- **Routes**: API endpoint definitions
- **Middleware**: Validation and error handling
- **Utils**: Helper functions and utilities

#### 3. **Validation Strategy**
- **Joi** for input validation with descriptive error messages
- **Business rule validation** in the Task model
- **Route-level validation** middleware

#### 4. **Error Handling**
- Centralized error handling with custom error classes
- Consistent error response format
- Proper HTTP status codes

### Business Rules Implementation

#### 1. **Status Transitions**
- Enforced state machine: pending → in-progress → completed → archived
- Cannot skip states or move backwards
- Validation in `Task.canTransitionTo()` method

#### 2. **Task Dependencies**
- Cycle detection using Depth-First Search (DFS)
- Dependency completion checking before status transitions
- Prevents deletion of tasks with dependents

#### 3. **Date Validation**
- Due dates cannot be in the past (allows today)
- Automatic timestamp management (createdAt, updatedAt)

#### 4. **High Priority Task Rules**
- High priority tasks must be completed before archiving
- Validation in `Task.canBeArchived()` method

### Advanced Features Implemented

#### 1. **Task Dependencies** ✅
- Tasks can have dependencies on other tasks
- Dependency completion validation
- Cycle detection prevents circular dependencies
- Helper functions in `utils/helpers.js`

#### 2. **Batch Operations** ✅
- Atomic batch create/update/delete operations
- Partial failure handling with detailed error reporting
- All-or-nothing approach for data consistency

#### 3. **Task Analytics** ✅
- Completion rate calculation
- Average completion time by priority
- Popular tags analysis
- Empty data handling

#### 4. **Advanced Query Features** ✅
- Multiple filter combinations
- Flexible sorting options
- Efficient pagination
- Search functionality with pagination

### Testing Strategy

This project implements a comprehensive testing strategy covering unit tests, integration tests, and performance tests to ensure code quality and reliability.

#### Test Structure
```
tests/
├── setup.js                     # Global test configuration
├── unit/                        # Unit tests for business logic
│   ├── task.model.test.js      # Task model and validation
│   └── helpers.test.js         # Utility functions
├── integration/                 # API endpoint integration tests
│   ├── api.endpoints.test.js   # Complete API functionality
│   └── error.handling.test.js  # Error scenarios and edge cases
├── performance/                 # Performance and load tests
│   └── load.test.js           # Load testing and benchmarks
└── tasks.test.js               # Legacy test file (maintained for compatibility)
```

#### 1. **Unit Tests** (`tests/unit/`)
- **Purpose**: Test individual components and business logic in isolation
- **Coverage**: Task model creation, validation, methods, status transitions, business rules, utility functions
- **Run Command**: `npm run test:unit`
- **Features**: Fast execution, isolated environment, comprehensive business logic coverage

#### 2. **Integration Tests** (`tests/integration/`)
- **Purpose**: Test complete API workflows and endpoint interactions
- **Coverage**: All CRUD operations, filtering, search, batch operations, analytics, error handling
- **Run Command**: `npm run test:integration`
- **Features**: Real HTTP requests, end-to-end workflows, API contract verification

#### 3. **Performance Tests** (`tests/performance/`)
- **Purpose**: Validate system performance under load and stress conditions
- **Coverage**: Load testing (100+ concurrent operations), memory monitoring, response times
- **Run Command**: `npm test -- --testPathPattern="performance"`
- **Features**: Performance benchmarking, memory leak detection, concurrency validation

#### Running Tests
```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests with coverage
npm run test:coverage

# Run for CI/CD
npm run test:ci
```

#### Test Best Practices
- Test independence and isolation
- Descriptive test names following "should [behavior] when [condition]" pattern
- Arrange-Act-Assert structure
- Comprehensive edge case coverage
- Clean setup and teardown

## Assumptions Made

1. **Task IDs**: Auto-incrementing integers starting from 1
2. **Date Format**: ISO 8601 date strings accepted for input
3. **Tag Handling**: Case-sensitive string matching
4. **Dependencies**: Numeric task IDs in array format
5. **Pagination**: Default page size of 10, maximum of 100
6. **Search**: Case-insensitive partial matching on title and description

## Trade-offs

### 1. **In-Memory vs Database**
- **Chosen**: In-memory storage
- **Trade-off**: Simplicity vs. persistence
- **Reasoning**: Meets requirements, easier testing, faster development

### 2. **Validation Approach**
- **Chosen**: Joi + Model validation
- **Trade-off**: Performance vs. comprehensive validation
- **Reasoning**: Better error messages, easier maintenance

### 3. **Error Handling**
- **Chosen**: Custom error classes + middleware
- **Trade-off**: More code vs. consistent responses
- **Reasoning**: Better API usability, easier debugging

### 4. **Status Transitions**
- **Chosen**: Strict state machine
- **Trade-off**: Flexibility vs. data integrity
- **Reasoning**: Prevents invalid states, clear business rules

## How to Improve with More Time

### 1. **Performance Optimizations**
- **Caching**: Redis for frequently accessed tasks
- **Rate Limiting**: Express rate limiting middleware
- **Request Queuing**: Bull queue for batch operations
- **Database Indexing**: Proper indexes for common queries

### 2. **Additional Features**
- **User Management**: Multi-user support with authentication
- **Task Assignments**: Assign tasks to specific users
- **Subtasks**: Hierarchical task structure
- **Comments**: Task discussion threads
- **File Attachments**: Document storage
- **Notifications**: Email/webhook notifications for status changes

### 3. **API Enhancements**
- **OpenAPI/Swagger**: Interactive API documentation
- **API Versioning**: Version management for breaking changes
- **GraphQL**: Alternative query interface
- **WebSocket**: Real-time updates
- **Audit Trail**: Change history tracking

### 4. **Production Readiness**
- **Logging**: Structured logging with Winston
- **Monitoring**: Health checks and metrics
- **Security**: Input sanitization, CORS configuration
- **Configuration**: Environment-based configuration management
- **Docker**: Containerization for deployment

## How to Modify for Scale

### 1. **Database Layer**
```javascript
// Replace in-memory Map with database
const taskRepository = {
  async findById(id) { /* Database query */ },
  async create(task) { /* Database insert */ },
  async update(id, updates) { /* Database update */ },
  async delete(id) { /* Database delete */ }
};
```

### 2. **Caching Strategy**
```javascript
// Add Redis caching layer
const cache = require('redis').createClient();
const getCachedTasks = async (filters) => {
  const key = `tasks:${JSON.stringify(filters)}`;
  const cached = await cache.get(key);
  return cached ? JSON.parse(cached) : null;
};
```

### 3. **Message Queue for Batch Operations**
```javascript
// Use Bull queue for heavy operations
const Queue = require('bull');
const batchQueue = new Queue('batch operations');

batchQueue.process('batch-create', async (job) => {
  const { tasks } = job.data;
  // Process in chunks to avoid memory issues
});
```

### 4. **Microservices Architecture**
- **Task Service**: Core task CRUD operations
- **Analytics Service**: Reporting and analytics
- **Notification Service**: Email/webhook notifications
- **Search Service**: Elasticsearch for advanced search

### 5. **Database Design for Scale**
```sql
-- Partitioned tables for large datasets
CREATE TABLE tasks (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL,
  priority VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Indexes for common queries
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_user_priority ON tasks(user_id, priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
```

### 6. **API Gateway and Load Balancing**
- **API Gateway**: Rate limiting, authentication, routing
- **Load Balancer**: Distribute traffic across instances
- **Auto-scaling**: Scale based on CPU/memory usage

## Technology Choices for Scale

1. **Database**: PostgreSQL with read replicas
2. **Cache**: Redis cluster
3. **Message Queue**: Redis Bull or Apache Kafka
4. **Search**: Elasticsearch
5. **Monitoring**: Prometheus + Grafana
6. **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
7. **Container Orchestration**: Kubernetes
8. **CI/CD**: GitHub Actions or Jenkins

This solution provides a solid foundation that can be extended and scaled based on specific requirements and growth patterns. 