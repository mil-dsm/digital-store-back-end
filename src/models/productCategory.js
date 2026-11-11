const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

module.exports = sequelize.define('ProductCategory', {
    product_id: { type: DataTypes.INTEGER, primaryKey: true },
    category_id: { type: DataTypes.INTEGER, primaryKey: true },
}, { tableName: 'product_categories', timestamps: false });