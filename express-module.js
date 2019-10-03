require('dotenv').config();
const express = require('express');
const files = require('./files');
const logger = require('./log-module');

const app = express();

app.listen(5000, () => {});
app.get('/', (req, res) => { res.send("Migration Server OSS Directory")});
app.get('/migrate/data', (req, res) => {
  
  res.send("Started Data Migration");
});

app.get('/migrate/files', (req, res) => {
  files.start();
  res.send("Started File Migration");
})

app.get('/migrate/all', (req, res) => {
  res.send("Started a complete Migration");
});

app.get('/migrate/delete/data', (req, res) => {
  res.send("Deleting Data");
});

app.get('/status', (req, res) => {

    const report = logger.logs.join("<br />");

    res.send(report);
});