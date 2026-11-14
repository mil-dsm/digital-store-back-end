const productService = require('../services/productService');
const { parsePagination } = require('../utils/pagination');

const baseUrl = (req) => `${req.protocol}://${req.get('host')}`;

function parseOptionFilters(query) {
    const filters = [];
    const add = (optionId, raw) => {
        if (typeof raw !== 'string') return false;
        const values = raw.split(',').map((v) => v.trim()).filter(Boolean);
        if (values.length === 0) return false;
        filters.push({ optionId: Number(optionId), values });
        return true;
    };

    // option[45]=GG,PP chega como chave literal "option[45]" (Express 5)
    // ou como query.option = { 45: 'GG,PP' } (Express 4)
    for (const [key, value] of Object.entries(query)) {
        const match = key.match(/^option\[(\d+)\]$/);
        if (match && !add(match[1], value)) return null;

        if (key === 'option' && typeof value === 'object') {
            for (const [optionId, raw] of Object.entries(value)) {
                if (!/^\d+$/.test(optionId) || !add(optionId, raw)) return null;
            }
        }
    }
    return filters;
}

// Devolve null se algum parâmetro da query estiver inválido
function parseSearchQuery(query) {
    const pagination = parsePagination(query);
    if (!pagination) return null;

    let fields;
    if (query.fields !== undefined) {
        fields = String(query.fields).split(',').map((f) => f.trim());
        if (fields.some((f) => !productService.ALLOWED_FIELDS.includes(f))) return null;
    }

    let match;
    if (query.match !== undefined) {
        if (typeof query.match !== 'string' || query.match.trim() === '') return null;
        match = query.match.trim();
    }

    let categoryIds;
    if (query.category_ids !== undefined) {
        const parts = String(query.category_ids).split(',').map((p) => p.trim());
        if (parts.some((p) => !/^\d+$/.test(p))) return null;
        categoryIds = parts.map(Number);
    }

    let priceRange;
    if (query['price-range'] !== undefined) {
        const found = String(query['price-range']).match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
        if (!found || Number(found[1]) > Number(found[2])) return null;
        priceRange = { min: Number(found[1]), max: Number(found[2]) };
    }

    const optionFilters = parseOptionFilters(query);
    if (!optionFilters) return null;

    return { ...pagination, fields, match, categoryIds, priceRange, optionFilters };
}

exports.search = async (req, res) => {
    const params = parseSearchQuery(req.query);
    if (!params) return res.status(400).json({ message: 'Parâmetros inválidos' });

    const { data, total } = await productService.search(params, baseUrl(req));
    return res.status(200).json({ data, total, limit: params.limit, page: params.page });
};

exports.getById = async (req, res) => {
    const product = await productService.findById(req.params.id, baseUrl(req));
    if (!product) return res.status(404).json({ message: 'Produto não encontrado' });
    return res.status(200).json(product);
};

exports.create = async (req, res) => {
    const product = await productService.create(req.body, baseUrl(req));
    return res.status(201).json(product);
};

exports.update = async (req, res) => {
    const product = await productService.update(req.params.id, req.body);
    if (!product) return res.status(404).json({ message: 'Produto não encontrado' });
    return res.status(204).send();
};

exports.remove = async (req, res) => {
    const deleted = await productService.remove(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Produto não encontrado' });
    return res.status(204).send();
};