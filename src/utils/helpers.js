/**
 * Detects cycles in task dependencies using DFS
 * @param {Map} tasks - Map of all tasks
 * @param {number} taskId - ID of the task to check
 * @param {Set} visited - Set of visited task IDs
 * @param {Set} recursionStack - Set of task IDs in current recursion stack
 * @returns {boolean} - True if cycle is detected
 */
const detectCycle = (tasks, taskId, visited = new Set(), recursionStack = new Set()) => {
  visited.add(taskId);
  recursionStack.add(taskId);

  const task = tasks.get(taskId);
  if (!task) return false;

  for (const depId of task.dependencies) {
    if (!visited.has(depId)) {
      if (detectCycle(tasks, depId, visited, recursionStack)) {
        return true;
      }
    } else if (recursionStack.has(depId)) {
      return true; // Cycle detected
    }
  }

  recursionStack.delete(taskId);
  return false;
};

/**
 * Validates that adding a dependency won't create a cycle
 * @param {Map} tasks - Map of all tasks
 * @param {number} taskId - ID of the task to add dependency to
 * @param {number} dependencyId - ID of the dependency to add
 * @returns {boolean} - True if adding dependency would create a cycle
 */
const wouldCreateCycle = (tasks, taskId, dependencyId) => {
  const task = tasks.get(taskId);
  if (!task) return false;

  // Temporarily add the dependency
  const originalDeps = [...task.dependencies];
  task.dependencies.push(dependencyId);

  // Check for cycles
  const hasCycle = detectCycle(tasks, taskId);

  // Restore original dependencies
  task.dependencies = originalDeps;

  return hasCycle;
};

/**
 * Gets all tasks that depend on a given task (directly or indirectly)
 * @param {Map} tasks - Map of all tasks
 * @param {number} taskId - ID of the task to find dependents for
 * @returns {Array} - Array of task IDs that depend on the given task
 */
const getAllDependents = (tasks, taskId) => {
  const dependents = new Set();
  
  const findDependents = (id) => {
    Array.from(tasks.values()).forEach(task => {
      if (task.dependencies.includes(id) && !dependents.has(task.id)) {
        dependents.add(task.id);
        findDependents(task.id); // Recursively find dependents
      }
    });
  };

  findDependents(taskId);
  return Array.from(dependents);
};

/**
 * Calculates task priority score for sorting
 * @param {string} priority - Task priority (low, medium, high)
 * @returns {number} - Numeric priority score
 */
const getPriorityScore = (priority) => {
  const scores = {
    'low': 1,
    'medium': 2,
    'high': 3
  };
  return scores[priority] || 0;
};

/**
 * Formats duration in a human-readable format
 * @param {number} days - Number of days
 * @returns {string} - Formatted duration string
 */
const formatDuration = (days) => {
  if (days < 1) {
    return 'Less than a day';
  } else if (days === 1) {
    return '1 day';
  } else if (days < 7) {
    return `${Math.round(days)} days`;
  } else if (days < 30) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? '1 week' : `${weeks} weeks`;
  } else {
    const months = Math.round(days / 30);
    return months === 1 ? '1 month' : `${months} months`;
  }
};

/**
 * Safely parses JSON with error handling
 * @param {string} jsonString - JSON string to parse
 * @param {any} defaultValue - Default value if parsing fails
 * @returns {any} - Parsed JSON or default value
 */
const safeJsonParse = (jsonString, defaultValue = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return defaultValue;
  }
};

module.exports = {
  detectCycle,
  wouldCreateCycle,
  getAllDependents,
  getPriorityScore,
  formatDuration,
  safeJsonParse
}; 