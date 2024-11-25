# Task Management System - Technical Interview

## Overview
Welcome to the Summit Task Management System technical interview! In this challenge, you'll be building a RESTful API for a task management system with some specific requirements that will test your Node.js skills, understanding of asynchronous programming, and ability to implement business logic.

## Getting Started
This repository contains a basic project structure to help you get started. We've provided:
- Basic Express.js setup
- Project structure with recommended directories
- Sample test setup
- API documentation structure

You are free to modify any of the starter code or start from scratch if you prefer a different approach. You will be evaluated based on the final implementation, not on how much of the starter code you use.

## The Challenge

### Core Requirements

Build a task management API with the following features:

1. **Task Management**
   - Create, read, update, and delete tasks
   - Each task should have:
     - Title (required)
     - Description (required)
     - Due date (required)
     - Status (pending, in-progress, completed, archived)
     - Priority (low, medium, high)
     - Tags (array of strings)
     - Created at timestamp
     - Updated at timestamp

2. **Task Validation & Business Rules**
   - Tasks cannot be created with a due date in the past
   - Task status transitions must follow this flow:
     - pending → in-progress → completed → archived
     - Cannot skip states or move backwards
   - High priority tasks cannot be archived unless completed
   - Tasks must have at least one tag

3. **Query Features**
   - Implement filtering by:
     - Status
     - Priority
     - Due date range
     - Tags
   - Implement sorting by:
     - Due date
     - Priority
     - Created date
   - Implement pagination
   - Search tasks by title or description

### Bonus Challenges (Optional)

1. **Task Dependencies**
   - Allow tasks to have dependencies on other tasks
   - A task cannot be marked as completed if its dependencies aren't completed
   - Implement cycle detection in task dependencies

2. **Batch Operations**
   - Implement batch create/update/delete operations
   - Ensure all operations in a batch are atomic (all succeed or all fail)

3. **Task Analytics**
   - Implement endpoints that return:
     - Tasks completion rate over time
     - Average time to complete tasks by priority
     - Most used tags

4. **Performance Optimization**
   - Implement caching for frequently accessed tasks
   - Add rate limiting to API endpoints
   - Implement request queuing for batch operations

## Technical Requirements

- Use Node.js and Express.js
- Use in-memory storage (no need for a database)
- Include comprehensive error handling
- Write unit tests for business logic
- Write integration tests for API endpoints
- Include API documentation (Swagger/OpenAPI)
- Use TypeScript (optional but preferred)

## Project Structure
```
summit-interview/
├── src/
│   ├── controllers/    # Request handlers
│   ├── models/        # Data models
│   ├── routes/        # API routes
│   ├── middleware/    # Custom middleware
│   ├── utils/         # Utility functions
│   └── app.js         # Express app setup
├── tests/            # Test files
├── .env.example      # Example environment variables
├── .gitignore        # Git ignore file
├── package.json      # Project dependencies and scripts
└── README.md         # Project documentation
```

## Getting Started

1. Clone the repository
```bash
git clone <repository-url>
cd summit-interview
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file based on `.env.example`

4. Start the development server
```bash
npm run dev
```

5. Run tests
```bash
npm test
```

## Evaluation Criteria

Your submission will be evaluated based on:

1. **Code Quality (40%)**
   - Clean, maintainable code
   - Proper error handling
   - Effective use of design patterns
   - Code organization and structure

2. **Functionality (30%)**
   - Correct implementation of all required features
   - Proper handling of edge cases
   - API usability and consistency

3. **Testing (20%)**
   - Test coverage
   - Test quality and organization
   - Edge case testing

4. **Documentation (10%)**
   - Code documentation
   - API documentation
   - Setup instructions
   - Assumptions and trade-offs explained

## Submission Guidelines

1. Fork this repository
2. Implement the required features
3. Include a SOLUTION.md file explaining:
   - How to run your solution
   - Any assumptions you made
   - Any trade-offs you chose
   - How you would improve the solution with more time
   - How you would modify the solution for scale
4. Create a pull request

## Time Expectation

- Core Requirements: 2-3 hours
- Each Bonus Challenge: 1-2 hours
- You have up to 5 days to submit your solution

## Questions?

If you have any questions about the requirements, please reach out to patrickroach@summitmetals.com.

Good luck!