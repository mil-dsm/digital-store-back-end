const path = require('path');
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./docs/swagger');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const { UPLOAD_DIR } = require('./services/imageStorage');

const app = express();

app.use(cors());
// limite maior porque as imagens dos produtos chegam em base64
app.use(express.json({ limit: '10mb' }));

// serve as imagens salvas: http://localhost:3000/media/arquivo.png
app.use('/media', express.static(path.join(UPLOAD_DIR, 'media')));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// documentação interativa: http://localhost:3000/docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/v1/user', userRoutes);
app.use('/v1/category', categoryRoutes);
app.use('/v1/product', productRoutes);

// JSON malformado, erros com status (httpError) e erros inesperados
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'JSON inválido' });
  }
  if (err.status) {
    return res.status(err.status).json({ message: err.message });
  }
  console.error(err);
  return res.status(500).json({ message: 'Erro interno do servidor' });
});

module.exports = app;