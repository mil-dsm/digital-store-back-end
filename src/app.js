const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');

const app = express();

app.use(cors());
// limite maior porque as imagens dos produtos chegam em base64
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/v1/user', userRoutes);

// JSON malformado e outros erros inesperados
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'JSON inválido' });
  }
  console.error(err);
  return res.status(500).json({ message: 'Erro interno do servidor' });
});

module.exports = app;