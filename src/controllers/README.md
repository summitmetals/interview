# Controllers Directory

Add your controller logic in this directory.

Example structure for a controller file:

```javascript
// Example controller structure
exports.getAllTasks = async (req, res) => {
  try {
    // Implement your logic here
    res.json({ message: 'Get all tasks' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createTask = async (req, res) => {
  try {
    // Implement your logic here
    res.status(201).json({ message: 'Task created' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
```
