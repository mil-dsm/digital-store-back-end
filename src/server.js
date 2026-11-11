require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/database');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Conectado ao MySQL');
    app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));
  } catch (error) {
    console.error('Erro ao conectar no banco:', error.message);
    process.exit(1);
  }
}

start();