const categoryService = require('../services/categoryService');

const isFilled = (value) => typeof value === 'string' && value.trim() !== '';

function validCategory({ name, slug, use_in_menu }) {
    return (
        isFilled(name) &&
        isFilled(slug) &&
        (use_in_menu === undefined || typeof use_in_menu === 'boolean')
    );
}

// Devolve null se algum parâmetro da query estiver inválido
function parseSearchQuery(query) {
    const limit = query.limit === undefined ? 12 : Number(query.limit);
    const page = query.page === undefined ? 1 : Number(query.page);

    if (!Number.isInteger(limit) || (limit !== -1 && limit < 1)) return null;
    if (!Number.isInteger(page) || page < 1) return null;

    let fields;
    if (query.fields !== undefined) {
        fields = String(query.fields).split(',').map((field) => field.trim());
        if (fields.some((field) => !categoryService.ALLOWED_FIELDS.includes(field))) return null;
    }

    let useInMenu;
    if (query.use_in_menu !== undefined) {
        if (!['true', 'false'].includes(query.use_in_menu)) return null;
        useInMenu = query.use_in_menu === 'true';
    }

    return { limit, page, fields, useInMenu };
}

exports.search = async (req, res) => {
    const params = parseSearchQuery(req.query);
    if (!params) return res.status(400).json({ message: 'Parâmetros inválidos' });

    const { data, total } = await categoryService.search(params);
    return res.status(200).json({ data, total, limit: params.limit, page: params.page });
};

exports.getById = async (req, res) => {
    const category = await categoryService.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Categoria não encontrada' });
    return res.status(200).json(category);
};

exports.create = async (req, res) => {
    if (!validCategory(req.body)) {
        return res.status(400).json({ message: 'Dados inválidos' });
    }
    const category = await categoryService.create(req.body);
    return res.status(201).json(category);
};

exports.update = async (req, res) => {
    if (!validCategory(req.body)) {
        return res.status(400).json({ message: 'Dados inválidos' });
    }
    const category = await categoryService.update(req.params.id, req.body);
    if (!category) return res.status(404).json({ message: 'Categoria não encontrada' });
    return res.status(204).send();
};

exports.remove = async (req, res) => {
    const deleted = await categoryService.remove(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Categoria não encontrada' });
    return res.status(204).send();
};