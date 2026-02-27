'use strict';

const express = require('express');
const bcrypt  = require('bcrypt');
const router  = express.Router();

// GET /admin/login
router.get('/login', (req, res) => {
  if (req.session && req.session.authenticated) {
    return res.redirect('/admin');
  }
  res.render('admin/login', { error: null });
});

// POST /admin/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const validUser = username === process.env.ADMIN_USER;
  let validPass   = false;

  try {
    validPass = await bcrypt.compare(password, process.env.ADMIN_HASH);
  } catch (e) {
    // hash not yet configured
  }

  if (validUser && validPass) {
    req.session.authenticated = true;
    req.session.username = username;
    return res.redirect('/admin');
  }

  res.render('admin/login', { error: 'Invalid username or password.' });
});

// POST /admin/logout
router.post('/logout', (req, res) => {
  req.session = null;   // cookie-session: clear by setting to null
  res.redirect('/admin/login');
});

module.exports = router;
