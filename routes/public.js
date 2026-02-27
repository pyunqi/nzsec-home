'use strict';

const express              = require('express');
const { readContent, readPages } = require('../lib/db');
const router               = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const [content, pagesData] = await Promise.all([readContent(), readPages()]);
    res.render('index', { content, pages: pagesData.pages });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
