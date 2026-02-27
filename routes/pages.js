'use strict';

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();

const PAGES_PATH   = path.join(__dirname, '../data/pages.json');
const CONTENT_PATH = path.join(__dirname, '../data/content.json');

function readPages() {
  return JSON.parse(fs.readFileSync(PAGES_PATH, 'utf8'));
}

function readContent() {
  return JSON.parse(fs.readFileSync(CONTENT_PATH, 'utf8'));
}

// GET /:slug — render a dynamic page
router.get('/:slug', (req, res, next) => {
  const { pages } = readPages();
  const page = pages.find(p => p.slug === req.params.slug);
  if (!page) return next();
  const content = readContent();
  res.render('page', { page, content, pages });
});

module.exports = router;
