const { Sequelize } = require('sequelize');
const configs = require('./config');

const config = configs[process.env.NODE_ENV] || configs.development;

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  config
);

module.exports = sequelize;
