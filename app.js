// ===================
// app.js / server.js
// ===================

// Load environment variables
require('dotenv').config();

// Core dependencies
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
const cors = require('cors');

// Routers
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const ordersRouter = require('./routes/orders');

const app = express();

// ===================
// MongoDB Connection
// ===================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ===================
// Middleware
// ===================
app.use(cors()); // Allow frontend requests
app.use(logger('dev'));
app.use(express.json()); // 🔥 VERY IMPORTANT
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ===================
// Routes
// ===================
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/orders', ordersRouter);

// ===================
// 404 Handler (JSON)
// ===================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ===================
// Global Error Handler (JSON)
// ===================
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ===================
// Start Server
// ===================
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});

module.exports = app;