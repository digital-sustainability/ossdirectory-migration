require('dotenv').config();
const express = require('express');

const app = express();

app.listen(4200, () => {});
app.get('/', (req, res) => { res.send("Migration Server OSS Directory")});
app.get('/migrate/data', (req, res) => {
  res.send("Started Data Migration");
});

app.get('/migrate/files', (req, res) => {
  res.send("Started File Migration");
})

app.get('/migrate/all', (req, res) => {
  res.send("Started a complete Migration");
});

app.get('/migrate/delete/data', (req, res) => {
  res.send("Deleting Data");
});

app.get('/status', (req, res) => {
  res.send("Current Logs: ");
});