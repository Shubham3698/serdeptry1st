const express = require('express');
const path = require('path');
const router = express.Router();

// React build path
const reactBuildPath = path.join(__dirname, '../client/build');

// GET / - serve React index.html
router.get('/', (req, res) => {
  res.sendFile(path.join(reactBuildPath, 'index.html'));
});

module.exports = router;