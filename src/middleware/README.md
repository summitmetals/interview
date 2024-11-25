# Middleware Directory

Add your custom middleware functions in this directory.

Example structure for a middleware file:

```javascript
// Example validation middleware
exports.validateTask = (req, res, next) => {
  // Implement your validation logic here
  // Example:
  // if (!req.body.title) {
  //   return res.status(400).json({ error: 'Title is required' });
  // }
  next();
};
```
