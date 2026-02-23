// ===================
// app.js / server.js
// ===================

// Load environment variables
const ordersRouter = require('./routes/orders'); // Add this
require('dotenv').config();

// Core dependencies
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
const cors = require('cors'); // CORS

// Routers
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

const app = express();

// ===================
// MongoDB Connection
// ===================
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ===================
// View Engine Setup
// ===================
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ===================
// Middleware
// ===================
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// ✅ Enable CORS for all origins (so independent HTML can hit server)
app.use(cors());

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// ===================
// Routes
// ===================
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/orders', ordersRouter);

// ===================
// 404 Error Handler
// ===================
app.use(function(req, res, next) {
  const createError = require('http-errors');
  next(createError(404));
});

// ===================
// General Error Handler
// ===================
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

// ===================
// Start Server
// ===================
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});

module.exports = app;