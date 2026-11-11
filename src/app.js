const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
// limite maior para deixar folga, uma vez que as imagens dos produtos chegam em base64
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

module.exports = app;