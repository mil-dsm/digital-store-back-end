// interpreta limits e page
// Retorna null se limit ou page forem inválidos
function parsePagination(query) {
    const limit = query.limit === undefined ? 12 : Number(query.limit);
    const page = query.page === undefined ? 1 : Number(query.page);

    if (!Number.isInteger(limit) || (limit !== -1 && limit < 1)) return null;
    if (!Number.isInteger(page) || page < 1) return null;

    return { limit, page };
}

module.exports = { parsePagination };