const imageStorage = require('../services/imageStorage');

const isFilled = (v) => typeof v === 'string' && v.trim() !== '' && v.length <= 255;
const isMoney = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isUrl = (v) => typeof v === 'string' && /^https?:\/\//.test(v);

function validImage(image, isUpdate) {
    if (typeof image !== 'object' || image === null) return false;

    // No PUT a imagem com id é alteração ou exclusão de uma existente
    if (isUpdate && image.id !== undefined) {
        if (!Number.isInteger(image.id)) return false;
        if (image.deleted === true || image.content === undefined) return true;
        return isUrl(image.content) || imageStorage.parseImage(image) !== null;
    }

    return imageStorage.parseImage(image) !== null;
}

// Só valida os campos que vieram (serve para opção nova e para atualização parcial)
function validOptionFields(option) {
    const values = option.values ?? option.value; // o projeto usa "value" e "values"

    return (
        (option.title === undefined || isFilled(option.title)) &&
        (option.shape === undefined || ['square', 'circle'].includes(option.shape)) &&
        (option.type === undefined || ['text', 'color'].includes(option.type)) &&
        (option.radius === undefined || /^\d+(px)?$/.test(String(option.radius))) &&
        (values === undefined ||
            (Array.isArray(values) &&
                values.length > 0 &&
                values.every(isFilled) &&
                values.join(',').length <= 255))
    );
}

function validOption(option, isUpdate) {
    if (typeof option !== 'object' || option === null) return false;

    if (isUpdate && option.id !== undefined) {
        if (!Number.isInteger(option.id)) return false;
        return option.deleted === true || validOptionFields(option);
    }

    // Título e valores são obrigatórios
    const values = option.values ?? option.value;
    return isFilled(option.title) && values !== undefined && validOptionFields(option);
}

module.exports = function validateProduct(req, res, next) {
    const isUpdate = req.method === 'PUT';
    const b = req.body;

    const ok =
        b !== null && typeof b === 'object' &&
        isFilled(b.name) &&
        isFilled(b.slug) &&
        isMoney(b.price) &&
        isMoney(b.price_with_discount) &&
        (b.enabled === undefined || typeof b.enabled === 'boolean') &&
        (b.stock === undefined || (Number.isInteger(b.stock) && b.stock >= 0)) &&
        (b.description === undefined ||
            (typeof b.description === 'string' && b.description.length <= 255)) &&
        (b.category_ids === undefined ||
            (Array.isArray(b.category_ids) && b.category_ids.every((id) => Number.isInteger(id) && id > 0))) &&
        (b.images === undefined ||
            (Array.isArray(b.images) && b.images.every((image) => validImage(image, isUpdate)))) &&
        (b.options === undefined ||
            (Array.isArray(b.options) && b.options.every((option) => validOption(option, isUpdate))));

    if (!ok) return res.status(400).json({ message: 'Dados inválidos' });
    next();
};