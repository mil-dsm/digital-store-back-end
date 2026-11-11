const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User } = require('../models');

const PUBLIC_FIELDS = ['id', 'firstname', 'surname', 'email'];

async function findById(id) {
    return User.findByPk(id, { attributes: PUBLIC_FIELDS });
}

async function emailInUse(email, ignoreId = null) {
    const where = { email };
    if (ignoreId) where.id = { [Op.ne]: ignoreId };
    return (await User.count({ where })) > 0;
}

async function create({ firstname, surname, email, password }) {
    const hash = await bcrypt.hash(password, 10); // nunca salvar a senha pura
    const user = await User.create({ firstname, surname, email, password: hash });
    return { id: user.id, firstname, surname, email };
}

async function update(id, { firstname, surname, email }) {
    const user = await User.findByPk(id);
    if (!user) return null;
    await user.update({ firstname, surname, email });
    return user;
}

async function remove(id) {
    const user = await User.findByPk(id);
    if (!user) return false;
    await user.destroy();
    return true;
}

async function generateToken(email, password) {
    const user = await User.findOne({ where: { email } });
    if (!user) return null;

    const matches = await bcrypt.compare(password, user.password);
    if (!matches) return null;

    return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
        expiresIn: '1h',
    });
}

module.exports = { findById, emailInUse, create, update, remove, generateToken };