'use strict';

const express              = require('express');
const { readContent, readPages } = require('../lib/db');
const router               = express.Router();

// GET /:slug — render a dynamic page
router.get('/:slug', async (req, res, next) => {
  try {
    const [pagesData, content] = await Promise.all([readPages(), readContent()]);
    const { pages } = pagesData;
    const page = pages.find(p => p.slug === req.params.slug);
    if (!page) return next();
    res.render('page', { page, content, pages });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
