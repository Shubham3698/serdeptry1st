const express = require('express');
const router = express.Router();
const User = require('../models/user');

// ----- API: Create user via JSON -----
router.post('/create', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'All fields required' });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already exists' });

    const user = new User({ name, email, password });
    await user.save();

    res.status(201).json({ message: 'User created successfully', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ----- API: Get all users -----
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ----- EJS Form: Show create user form -----
router.get('/form', (req, res) => {
  res.render('create-user');
});

// ----- Handle form submit -----
router.post('/create-form', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.send('All fields required');

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.send('Email already exists');

    const user = new User({ name, email, password });
    await user.save();

    res.send(`✅ User created successfully: ${name}`);
  } catch (err) {
    console.error(err);
    res.send('Server error');
  }
});

module.exports = router;