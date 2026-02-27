'use strict';
require('dotenv').config();

const express       = require('express');
const cookieSession = require('cookie-session');
const path          = require('path');

const app = express();

// ----- View engine -----
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ----- Static assets -----
app.use(express.static(path.join(__dirname, 'public')));

// ----- Body parsing -----
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ----- Sessions (cookie-based — works in serverless) -----
app.use(cookieSession({
  name:   'nzsec.sess',
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  maxAge: 8 * 60 * 60 * 1000, // 8 hours
  httpOnly: true,
  sameSite: 'lax'
}));

// ----- Routes -----
app.use('/',       require('./routes/public'));
app.use('/admin',  require('./routes/auth'));
app.use('/admin',  require('./routes/admin'));
app.use('/',       require('./routes/pages'));   // dynamic /:slug — must be after named routes

// ----- Export for serverless (Netlify Functions) -----
module.exports = app;

// ----- Start locally when run directly -----
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`NZSEC server running at http://localhost:${PORT}`);
    console.log(`Admin panel:           http://localhost:${PORT}/admin`);
  });
}
