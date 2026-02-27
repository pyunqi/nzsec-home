'use strict';

// Explicitly require template engine so bundler includes it
require('ejs');

const serverless = require('serverless-http');
const app        = require('../../server');

module.exports.handler = serverless(app);
