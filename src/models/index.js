const sequelize = require('../config/database');
const User = require('./user');
const Category = require('./category');
const Product = require('./product');
const ProductImage = require('./productImage');
const ProductOption = require('./productOption');
const ProductCategory = require('./productCategory');

Product.hasMany(ProductImage, { foreignKey: 'product_id', as: 'images' });
ProductImage.belongsTo(Product, { foreignKey: 'product_id' });

Product.hasMany(ProductOption, { foreignKey: 'product_id', as: 'options' });
ProductOption.belongsTo(Product, { foreignKey: 'product_id' });

Product.belongsToMany(Category, {
    through: ProductCategory, foreignKey: 'product_id', otherKey: 'category_id', as: 'categories',
});
Category.belongsToMany(Product, {
    through: ProductCategory, foreignKey: 'category_id', otherKey: 'product_id', as: 'products',
});

module.exports = {
    sequelize, User, Category, Product, ProductImage, ProductOption, ProductCategory,
};