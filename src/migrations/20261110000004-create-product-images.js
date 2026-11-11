module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('product_images', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            product_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'products', key: 'id' },
                onDelete: 'CASCADE',
            },
            enabled: { type: Sequelize.BOOLEAN, defaultValue: false },
            path: { type: Sequelize.STRING, allowNull: false },
        });
    },
    async down(queryInterface) {
        await queryInterface.dropTable('product_images');
    },
};