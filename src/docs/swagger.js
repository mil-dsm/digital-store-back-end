const ref = (name) => ({ $ref: `#/components/schemas/${name}` });

const DESCRIPTIONS = {
    200: 'Requisição bem-sucedida',
    201: 'Criado com sucesso',
    204: 'Sucesso, sem corpo na resposta',
    400: 'Dados da requisição incorretos',
    401: 'Token não enviado ou inválido',
    404: 'Recurso não encontrado',
};

// Monta o bloco "responses" a partir da lista de códigos
function responses(codes, bodies = {}) {
    const result = {};
    for (const code of codes) {
        result[code] = { description: DESCRIPTIONS[code] };
        if (bodies[code]) {
            result[code].content = { 'application/json': { schema: bodies[code] } };
        }
    }
    return result;
}

const body = (schema, example) => ({
    required: true,
    content: { 'application/json': { schema, ...(example && { example }) } },
});

const bearer = [{ bearerAuth: [] }];

const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 1 };
const limitParam = {
    name: 'limit', in: 'query', schema: { type: 'integer', default: 12 },
    description: 'Itens por página. Use -1 para buscar todos.',
};
const pageParam = {
    name: 'page', in: 'query', schema: { type: 'integer', default: 1 },
    description: 'Página. Não tem efeito quando limit = -1.',
};

const PNG_1PX =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

module.exports = {
    openapi: '3.0.3',
    info: {
        title: 'Digital Store API',
        version: '1.0.0',
        description:
            'API de usuários, categorias e produtos da Digital Store. ' +
            'Para usar as rotas com cadeado, gere um token em POST /v1/user/token e clique em Authorize.',
    },
    servers: [{ url: 'http://localhost:3000' }],
    tags: [{ name: 'Usuários' }, { name: 'Categorias' }, { name: 'Produtos' }],

    paths: {
        // ---------- Usuários ----------
        '/v1/user': {
            post: {
                tags: ['Usuários'],
                summary: 'Cadastrar usuário',
                requestBody: body(ref('UserCreate')),
                responses: responses([201, 400], { 201: ref('UserPublic') }),
            },
        },
        '/v1/user/token': {
            post: {
                tags: ['Usuários'],
                summary: 'Gerar token JWT (login)',
                requestBody: body(ref('Login')),
                responses: responses([200, 400], { 200: ref('Token') }),
            },
        },
        '/v1/user/{id}': {
            get: {
                tags: ['Usuários'],
                summary: 'Buscar usuário pelo id',
                parameters: [idParam],
                responses: responses([200, 404], { 200: ref('UserPublic') }),
            },
            put: {
                tags: ['Usuários'],
                summary: 'Atualizar usuário',
                security: bearer,
                parameters: [idParam],
                requestBody: body(ref('UserUpdate')),
                responses: responses([204, 400, 401, 404]),
            },
            delete: {
                tags: ['Usuários'],
                summary: 'Deletar usuário',
                security: bearer,
                parameters: [idParam],
                responses: responses([204, 401, 404]),
            },
        },

        // ---------- Categorias ----------
        '/v1/category/search': {
            get: {
                tags: ['Categorias'],
                summary: 'Listar categorias (com paginação e filtros)',
                parameters: [
                    limitParam,
                    pageParam,
                    {
                        name: 'fields', in: 'query', schema: { type: 'string' }, example: 'name,slug',
                        description: 'Campos a retornar, separados por vírgula: id, name, slug, use_in_menu.',
                    },
                    {
                        name: 'use_in_menu', in: 'query', schema: { type: 'boolean' },
                        description: 'Filtra pelas categorias que aparecem (ou não) no menu.',
                    },
                ],
                responses: responses([200, 400], { 200: ref('CategorySearch') }),
            },
        },
        '/v1/category': {
            post: {
                tags: ['Categorias'],
                summary: 'Criar categoria',
                security: bearer,
                requestBody: body(ref('CategoryInput')),
                responses: responses([201, 400, 401], { 201: ref('Category') }),
            },
        },
        '/v1/category/{id}': {
            get: {
                tags: ['Categorias'],
                summary: 'Buscar categoria pelo id',
                parameters: [idParam],
                responses: responses([200, 404], { 200: ref('Category') }),
            },
            put: {
                tags: ['Categorias'],
                summary: 'Atualizar categoria',
                security: bearer,
                parameters: [idParam],
                requestBody: body(ref('CategoryInput')),
                responses: responses([204, 400, 401, 404]),
            },
            delete: {
                tags: ['Categorias'],
                summary: 'Deletar categoria',
                security: bearer,
                parameters: [idParam],
                responses: responses([204, 401, 404]),
            },
        },

        // ---------- Produtos ----------
        '/v1/product/search': {
            get: {
                tags: ['Produtos'],
                summary: 'Listar produtos (com paginação e filtros)',
                parameters: [
                    limitParam,
                    pageParam,
                    {
                        name: 'fields', in: 'query', schema: { type: 'string' }, example: 'name,price,images',
                        description:
                            'Campos a retornar, separados por vírgula: id, enabled, name, slug, stock, ' +
                            'description, price, price_with_discount, category_ids, images, options.',
                    },
                    {
                        name: 'match', in: 'query', schema: { type: 'string' }, example: 'Tenis',
                        description: 'Termo que combine com o nome ou a descrição do produto.',
                    },
                    {
                        name: 'category_ids', in: 'query', schema: { type: 'string' }, example: '1,2',
                        description: 'Ids de categorias separados por vírgula.',
                    },
                    {
                        name: 'price-range', in: 'query', schema: { type: 'string' }, example: '100-200',
                        description: 'Janela de preço no formato mínimo-máximo (usa o campo price).',
                    },
                    {
                        name: 'option[45]', in: 'query', schema: { type: 'string' }, example: 'GG,PP',
                        description: 'Filtra pelo valor de uma opção. Troque 45 pelo id da opção e liste os valores separados por vírgula.',
                    },
                ],
                responses: responses([200, 400], { 200: ref('ProductSearch') }),
            },
        },
        '/v1/product': {
            post: {
                tags: ['Produtos'],
                summary: 'Criar produto',
                description: 'As imagens são enviadas em base64 e salvas no servidor.',
                security: bearer,
                requestBody: body(ref('ProductInput'), {
                    enabled: true,
                    name: 'Tenis Nike',
                    slug: 'tenis-nike',
                    stock: 10,
                    description: 'Tenis de corrida',
                    price: 119.9,
                    price_with_discount: 99.9,
                    category_ids: [1],
                    images: [{ type: 'image/png', content: PNG_1PX }],
                    options: [
                        { title: 'Tamanho', shape: 'square', radius: '4px', type: 'text', values: ['PP', 'M', 'GG'] },
                        { title: 'Cor', shape: 'circle', type: 'color', values: ['#000', '#333'] },
                    ],
                }),
                responses: responses([201, 400, 401], { 201: ref('Product') }),
            },
        },
        '/v1/product/{id}': {
            get: {
                tags: ['Produtos'],
                summary: 'Buscar produto pelo id',
                parameters: [idParam],
                responses: responses([200, 404], { 200: ref('Product') }),
            },
            put: {
                tags: ['Produtos'],
                summary: 'Atualizar produto',
                description:
                    'Em images e options, um item sem id é criado, com id é alterado e com ' +
                    '"deleted": true é removido. Se category_ids for enviado, substitui as categorias atuais.',
                security: bearer,
                parameters: [idParam],
                requestBody: body(ref('ProductInput'), {
                    enabled: true,
                    name: 'Tenis Nike Air',
                    slug: 'tenis-nike-air',
                    stock: 20,
                    description: 'Atualizado',
                    price: 149.9,
                    price_with_discount: 0,
                    category_ids: [1],
                    images: [{ id: 1, deleted: true }],
                    options: [{ id: 1, radius: '10px', values: ['40', '41'] }],
                }),
                responses: responses([204, 400, 401, 404]),
            },
            delete: {
                tags: ['Produtos'],
                summary: 'Deletar produto',
                security: bearer,
                parameters: [idParam],
                responses: responses([204, 401, 404]),
            },
        },
    },

    components: {
        securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
        schemas: {
            UserPublic: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    firstname: { type: 'string', example: 'Milena' },
                    surname: { type: 'string', example: 'Mesquita' },
                    email: { type: 'string', example: 'milena@mail.com' },
                },
            },
            UserCreate: {
                type: 'object',
                required: ['firstname', 'surname', 'email', 'password', 'confirmPassword'],
                properties: {
                    firstname: { type: 'string', example: 'Milena' },
                    surname: { type: 'string', example: 'Mesquita' },
                    email: { type: 'string', example: 'milena@mail.com' },
                    password: { type: 'string', example: '123@123' },
                    confirmPassword: { type: 'string', example: '123@123' },
                },
            },
            UserUpdate: {
                type: 'object',
                required: ['firstname', 'surname', 'email'],
                properties: {
                    firstname: { type: 'string', example: 'Milena' },
                    surname: { type: 'string', example: 'Souza' },
                    email: { type: 'string', example: 'milena@mail.com' },
                },
            },
            Login: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                    email: { type: 'string', example: 'milena@mail.com' },
                    password: { type: 'string', example: '123@123' },
                },
            },
            Token: {
                type: 'object',
                properties: { token: { type: 'string' } },
            },

            Category: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    name: { type: 'string', example: 'Sapatos' },
                    slug: { type: 'string', example: 'sapatos' },
                    use_in_menu: { type: 'boolean', example: true },
                },
            },
            CategoryInput: {
                type: 'object',
                required: ['name', 'slug'],
                properties: {
                    name: { type: 'string', example: 'Sapatos' },
                    slug: { type: 'string', example: 'sapatos' },
                    use_in_menu: { type: 'boolean', example: true },
                },
            },
            CategorySearch: {
                type: 'object',
                properties: {
                    data: { type: 'array', items: ref('Category') },
                    total: { type: 'integer', example: 1 },
                    limit: { type: 'integer', example: 12 },
                    page: { type: 'integer', example: 1 },
                },
            },

            ProductImage: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    content: { type: 'string', example: 'http://localhost:3000/media/arquivo.png' },
                },
            },
            ProductOption: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    title: { type: 'string', example: 'Tamanho' },
                    shape: { type: 'string', enum: ['square', 'circle'] },
                    radius: { type: 'integer', example: 4 },
                    type: { type: 'string', enum: ['text', 'color'] },
                    values: { type: 'array', items: { type: 'string' }, example: ['PP', 'M', 'GG'] },
                },
            },
            Product: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    enabled: { type: 'boolean' },
                    name: { type: 'string' },
                    slug: { type: 'string' },
                    stock: { type: 'integer' },
                    description: { type: 'string' },
                    price: { type: 'number' },
                    price_with_discount: { type: 'number' },
                    category_ids: { type: 'array', items: { type: 'integer' } },
                    images: { type: 'array', items: ref('ProductImage') },
                    options: { type: 'array', items: ref('ProductOption') },
                },
            },
            ProductSearch: {
                type: 'object',
                properties: {
                    data: { type: 'array', items: ref('Product') },
                    total: { type: 'integer' },
                    limit: { type: 'integer', example: 12 },
                    page: { type: 'integer', example: 1 },
                },
            },
            ProductImageInput: {
                type: 'object',
                properties: {
                    id: { type: 'integer', description: 'Só no PUT: id de uma imagem existente.' },
                    deleted: { type: 'boolean', description: 'Só no PUT: remove a imagem.' },
                    type: { type: 'string', example: 'image/png' },
                    content: { type: 'string', description: 'Imagem em base64 (no PUT, uma URL mantém a imagem como está).' },
                },
            },
            ProductOptionInput: {
                type: 'object',
                properties: {
                    id: { type: 'integer', description: 'Só no PUT: id de uma opção existente.' },
                    deleted: { type: 'boolean', description: 'Só no PUT: remove a opção.' },
                    title: { type: 'string', example: 'Tamanho' },
                    shape: { type: 'string', enum: ['square', 'circle'] },
                    radius: { type: 'string', example: '4px' },
                    type: { type: 'string', enum: ['text', 'color'] },
                    values: { type: 'array', items: { type: 'string' }, example: ['PP', 'M', 'GG'] },
                },
            },
            ProductInput: {
                type: 'object',
                required: ['name', 'slug', 'price', 'price_with_discount'],
                properties: {
                    enabled: { type: 'boolean' },
                    name: { type: 'string' },
                    slug: { type: 'string' },
                    stock: { type: 'integer' },
                    description: { type: 'string' },
                    price: { type: 'number' },
                    price_with_discount: { type: 'number' },
                    category_ids: { type: 'array', items: { type: 'integer' } },
                    images: { type: 'array', items: ref('ProductImageInput') },
                    options: { type: 'array', items: ref('ProductOptionInput') },
                },
            },
        },
    },
};