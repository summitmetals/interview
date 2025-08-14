// Task statuses and priorities as enums
const TaskStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  ARCHIVED: 'archived'
};

const TaskPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

// Valid status transitions
const VALID_STATUS_TRANSITIONS = {
  [TaskStatus.PENDING]: [TaskStatus.IN_PROGRESS],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.COMPLETED],
  [TaskStatus.COMPLETED]: [TaskStatus.ARCHIVED],
  [TaskStatus.ARCHIVED]: []
};

class Task {
  constructor({
    id,
    title,
    description,
    dueDate,
    status = TaskStatus.PENDING,
    priority = TaskPriority.MEDIUM,
    tags = [],
    dependencies = []
  }) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.dueDate = new Date(dueDate);
    this.status = status;
    this.priority = priority;
    this.tags = Array.isArray(tags) ? tags : [];
    this.dependencies = Array.isArray(dependencies) ? dependencies : [];
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  update(updates) {
    if (updates.dueDate) {
      updates.dueDate = new Date(updates.dueDate);
    }
    Object.assign(this, updates);
    this.updatedAt = new Date();
  }

  canTransitionTo(newStatus) {
    const validTransitions = VALID_STATUS_TRANSITIONS[this.status];
    return validTransitions.includes(newStatus);
  }

  canBeArchived() {
    if (this.priority === TaskPriority.HIGH) {
      return this.status === TaskStatus.COMPLETED;
    }
    return true;
  }

  validate() {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset to start of day for comparison
    
    const dueDate = new Date(this.dueDate);
    dueDate.setHours(0, 0, 0, 0); // Reset to start of day for comparison

    // Check due date is not in the past (allow today)
    if (dueDate < now) {
      throw new Error('Due date cannot be in the past');
    }

    // Check required fields
    if (!this.title || !this.title.trim()) {
      throw new Error('Title is required');
    }

    if (!this.description || !this.description.trim()) {
      throw new Error('Description is required');
    }

    // Check tags
    if (!Array.isArray(this.tags) || this.tags.length === 0) {
      throw new Error('Task must have at least one tag');
    }

    // Validate status
    if (!Object.values(TaskStatus).includes(this.status)) {
      throw new Error('Invalid status');
    }

    // Validate priority
    if (!Object.values(TaskPriority).includes(this.priority)) {
      throw new Error('Invalid priority');
    }

    // Validate status transition for archiving
    if (this.status === TaskStatus.ARCHIVED && !this.canBeArchived()) {
      throw new Error('High priority tasks must be completed before archiving');
    }
  }
}

module.exports = {
  Task,
  TaskStatus,
  TaskPriority,
  VALID_STATUS_TRANSITIONS
};
