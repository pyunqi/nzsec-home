'use strict';

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();

const CONTENT_PATH = path.join(__dirname, '../data/content.json');
const PAGES_PATH   = path.join(__dirname, '../data/pages.json');

router.get('/', (req, res) => {
  const content = JSON.parse(fs.readFileSync(CONTENT_PATH, 'utf8'));
  const { pages } = JSON.parse(fs.readFileSync(PAGES_PATH, 'utf8'));
  res.render('index', { content, pages });
});

module.exports = router;
