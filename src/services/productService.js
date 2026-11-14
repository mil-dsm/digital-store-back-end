/**
 * Regras de negócio e banco de dados.
 */

const { Op } = require('sequelize');
const {
    sequelize, Product, ProductImage, ProductOption, ProductCategory, Category,
} = require('../models');
const imageStorage = require('./imageStorage');
const httpError = require('./httpError');

const PRODUCT_COLUMNS = [
    'id', 'enabled', 'name', 'slug', 'stock', 'description', 'price', 'price_with_discount',
];
const ALLOWED_FIELDS = [...PRODUCT_COLUMNS, 'category_ids', 'images', 'options'];

const isUrl = (value) => /^https?:\/\//.test(value);

/**
 * Formatação da resposta
 * */

function formatOption(option) {
    return {
        id: option.id,
        title: option.title,
        shape: option.shape,
        radius: option.radius,
        type: option.type,
        values: option.values.split(','),
    };
}

function formatProduct(product, baseUrl, fields) {
    const full = {};
    PRODUCT_COLUMNS.forEach((column) => { full[column] = product[column]; });

    if (product.categories) {
        full.category_ids = product.categories.map((c) => c.id).sort((a, b) => a - b);
    }
    if (product.images) {
        full.images = [...product.images]
            .sort((a, b) => a.id - b.id)
            .map((image) => ({ id: image.id, content: `${baseUrl}/${image.path}` }));
    }
    if (product.options) {
        full.options = [...product.options].sort((a, b) => a.id - b.id).map(formatOption);
    }

    if (!fields) return full;
    return Object.fromEntries(fields.map((field) => [field, full[field]]));
}

/**
 * Leitura
 * */

// Só carrega as tabelas relacionadas que o "fields" pediu
function buildIncludes(fields) {
    const wants = (name) => !fields || fields.includes(name);
    const include = [];

    if (wants('category_ids')) {
        include.push({ model: Category, as: 'categories', attributes: ['id'], through: { attributes: [] } });
    }
    if (wants('images')) include.push({ model: ProductImage, as: 'images' });
    if (wants('options')) include.push({ model: ProductOption, as: 'options' });
    return include;
}

async function loadProducts(ids, fields) {
    if (ids.length === 0) return [];

    const attributes = fields
        ? [...new Set(['id', ...fields.filter((f) => PRODUCT_COLUMNS.includes(f))])]
        : PRODUCT_COLUMNS;

    return Product.findAll({
        where: { id: { [Op.in]: ids } },
        attributes,
        include: buildIncludes(fields),
        order: [['id', 'ASC']],
    });
}

async function findById(id, baseUrl) {
    const [product] = await loadProducts(
        Number.isInteger(Number(id)) ? [Number(id)] : [],
        undefined
    );
    return product ? formatProduct(product, baseUrl) : null;
}

async function search(params, baseUrl) {
    const { limit, page, fields, match, categoryIds, priceRange, optionFilters } = params;
    const where = {};

    if (match) {
        where[Op.or] = [
            { name: { [Op.like]: `%${match}%` } },
            { description: { [Op.like]: `%${match}%` } },
        ];
    }
    if (priceRange) where.price = { [Op.between]: [priceRange.min, priceRange.max] };

    // Filtros que dependem de outras tabelas
    // Descobre os ids de produto de cada um e depois fazemos a interseção (todos os filtros precisam bater)
    const idSets = [];

    if (categoryIds) {
        const links = await ProductCategory.findAll({
            where: { category_id: { [Op.in]: categoryIds } },
            attributes: ['product_id'],
        });
        idSets.push(links.map((link) => link.product_id));
    }

    for (const { optionId, values } of optionFilters) {
        const options = await ProductOption.findAll({
            where: { id: optionId },
            attributes: ['product_id', 'values'],
        });
        idSets.push(
            options
                .filter((option) => option.values.split(',').some((v) => values.includes(v)))
                .map((option) => option.product_id)
        );
    }

    if (idSets.length > 0) {
        const ids = idSets.reduce((acc, set) => acc.filter((id) => set.includes(id)));
        if (ids.length === 0) return { data: [], total: 0 };
        where.id = { [Op.in]: ids };
    }

    const query = { where, attributes: ['id'], order: [['id', 'ASC']] };
    if (limit !== -1) {
        query.limit = limit;
        query.offset = (page - 1) * limit;
    }

    const { rows, count } = await Product.findAndCountAll(query);
    const products = await loadProducts(rows.map((row) => row.id), fields);

    return { data: products.map((p) => formatProduct(p, baseUrl, fields)), total: count };
}

/**
 * Escrita
 */

function productFields(data) {
    const fields = {};
    PRODUCT_COLUMNS.filter((c) => c !== 'id').forEach((key) => {
        if (data[key] !== undefined) fields[key] = data[key];
    });
    return fields;
}

function optionChanges(option) {
    const changes = {};
    const values = option.values ?? option.value;

    if (option.title !== undefined) changes.title = option.title;
    if (option.shape !== undefined) changes.shape = option.shape;
    if (option.type !== undefined) changes.type = option.type;
    if (option.radius !== undefined) changes.radius = parseInt(option.radius, 10); // "4px" -> 4
    if (values !== undefined) changes.values = values.join(',');
    return changes;
}

async function assertCategoriesExist(ids) {
    const found = await Category.count({ where: { id: { [Op.in]: ids } } });
    if (found !== ids.length) throw httpError(400, 'Categoria inexistente');
}

async function applyImageChanges(productId, images, transaction, newPaths, oldPaths) {
    for (const image of images) {
        // sem id: imagem nova
        if (image.id === undefined) {
            const imagePath = await imageStorage.save(image);
            newPaths.push(imagePath);
            await ProductImage.create(
                { product_id: productId, path: imagePath, enabled: true },
                { transaction }
            );
            continue;
        }

        const record = await ProductImage.findOne({
            where: { id: image.id, product_id: productId },
            transaction,
        });
        if (!record) throw httpError(400, `Imagem ${image.id} não pertence ao produto`);

        if (image.deleted) {
            oldPaths.push(record.path);
            await record.destroy({ transaction });
        } else if (image.content && !isUrl(image.content)) {
            // base64 novo: troca o arquivo. Se vier uma URL, a imagem fica como está
            const imagePath = await imageStorage.save(image);
            newPaths.push(imagePath);
            oldPaths.push(record.path);
            await record.update({ path: imagePath }, { transaction });
        }
    }
}

async function applyOptionChanges(productId, options, transaction) {
    for (const option of options) {
        if (option.id === undefined) {
            await ProductOption.create({ product_id: productId, ...optionChanges(option) }, { transaction });
            continue;
        }

        const record = await ProductOption.findOne({
            where: { id: option.id, product_id: productId },
            transaction,
        });
        if (!record) throw httpError(400, `Opção ${option.id} não pertence ao produto`);

        if (option.deleted) await record.destroy({ transaction });
        else await record.update(optionChanges(option), { transaction });
    }
}

async function create(data, baseUrl) {
    const categoryIds = data.category_ids ? [...new Set(data.category_ids)] : [];
    if (categoryIds.length > 0) await assertCategoriesExist(categoryIds);

    const savedPaths = [];
    try {
        const productId = await sequelize.transaction(async (transaction) => {
            const product = await Product.create(productFields(data), { transaction });

            await ProductCategory.bulkCreate(
                categoryIds.map((category_id) => ({ product_id: product.id, category_id })),
                { transaction }
            );
            await applyImageChanges(product.id, data.images || [], transaction, savedPaths, []);
            await applyOptionChanges(product.id, data.options || [], transaction);

            return product.id;
        });

        return await findById(productId, baseUrl);
    } catch (error) {
        await Promise.all(savedPaths.map(imageStorage.remove)); // não deixa arquivo órfão
        throw error;
    }
}

async function update(id, data) {
    const product = await Product.findByPk(id);
    if (!product) return null;

    const categoryIds = data.category_ids ? [...new Set(data.category_ids)] : undefined;
    if (categoryIds && categoryIds.length > 0) await assertCategoriesExist(categoryIds);

    const newPaths = [];
    const oldPaths = [];
    try {
        await sequelize.transaction(async (transaction) => {
            await product.update(productFields(data), { transaction });

            if (categoryIds) {
                await ProductCategory.destroy({ where: { product_id: product.id }, transaction });
                await ProductCategory.bulkCreate(
                    categoryIds.map((category_id) => ({ product_id: product.id, category_id })),
                    { transaction }
                );
            }
            if (data.images) await applyImageChanges(product.id, data.images, transaction, newPaths, oldPaths);
            if (data.options) await applyOptionChanges(product.id, data.options, transaction);
        });
    } catch (error) {
        await Promise.all(newPaths.map(imageStorage.remove));
        throw error;
    }

    await Promise.all(oldPaths.map(imageStorage.remove)); // só apaga os antigos depois do commit
    return product;
}

async function remove(id) {
    const product = await Product.findByPk(id, {
        include: [{ model: ProductImage, as: 'images' }],
    });
    if (!product) return false;

    const paths = product.images.map((image) => image.path);
    await product.destroy(); // imagens, opções e vínculos somem em sequência no banco
    await Promise.all(paths.map(imageStorage.remove));
    return true;
}

module.exports = { ALLOWED_FIELDS, search, findById, create, update, remove };