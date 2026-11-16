require('dotenv').config();

const base = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'mysql',
  define: {
    underscored: true, // criar created_at e updated_at do enunciado do trabalho
  },
};

module.exports = {
  development: { ...base, database: process.env.DB_NAME },
  // O Jest usa NODE_ENV=test: banco separado, para os testes não apagarem os dados de desenvolvimento
  test: { ...base, database: process.env.DB_NAME_TEST || 'digital_store_test', logging: false },
};
