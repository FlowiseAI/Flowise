// docker/healthcheck/healthcheck.js
const express = require('express');
const app = express();
const port = 3000;

app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

app.listen(port, () => {
  console.log(`Healthcheck server listening on port ${port}`);
});