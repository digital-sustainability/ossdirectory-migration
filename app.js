require('dotenv').config();

const migrate = require('./migrate');
const relations = require('./relations');
const files = require('./files');
const axiosclient = require('./axios-module');
const backstream = require('./backstream');