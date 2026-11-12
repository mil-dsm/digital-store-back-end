const { Category } = require('../models');

const ALLOWED_FIELDS = ['id', 'name', 'slug', 'use_in_menu'];

async function search({ limit, page, fields, useInMenu }) {
    const options = {
        attributes: fields || ALLOWED_FIELDS,
        where: {},
        order: [['id', 'ASC']],
    };

    if (useInMenu !== undefined) options.where.use_in_menu = useInMenu;

    // limit -1 significa "buscar todos": sem limit nem offset
    if (limit !== -1) {
        options.limit = limit;
        options.offset = (page - 1) * limit;
    }

    const { rows, count } = await Category.findAndCountAll(options);
    return { data: rows, total: count };
}

async function findById(id) {
    return Category.findByPk(id, { attributes: ALLOWED_FIELDS });
}

async function create({ name, slug, use_in_menu }) {
    const category = await Category.create({ name, slug, use_in_menu });
    return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        use_in_menu: category.use_in_menu,
    };
}

async function update(id, { name, slug, use_in_menu }) {
    const category = await Category.findByPk(id);
    if (!category) return null;

    const changes = { name, slug };
    if (use_in_menu !== undefined) changes.use_in_menu = use_in_menu;

    await category.update(changes);
    return category;
}

async function remove(id) {
    const category = await Category.findByPk(id);
    if (!category) return false;
    await category.destroy(); // os vínculos em product_categories somem em cascata
    return true;
}

module.exports = { ALLOWED_FIELDS, search, findById, create, update, remove };