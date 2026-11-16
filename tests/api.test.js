const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/models');

// 1x1 pixel PNG em base64
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

let auth; // cabeçalho Authorization com o token
const usuario = { firstname: 'Ana', surname: 'Silva', email: 'ana@mail.com', password: '123@123', confirmPassword: '123@123' };

beforeAll(async () => {
  await sequelize.sync({ force: true }); // recria as tabelas no banco de TESTE
  await request(app).post('/v1/user').send(usuario);
  const { body } = await request(app).post('/v1/user/token').send({ email: usuario.email, password: usuario.password });
  auth = `Bearer ${body.token}`;
});

afterAll(async () => { await sequelize.close(); });

describe('Usuários', () => {
  test('cadastro devolve 201 e não devolve a senha', async () => {
    const res = await request(app).post('/v1/user').send({ ...usuario, email: 'outro@mail.com' });
    expect(res.status).toBe(201);
    expect(res.body.password).toBeUndefined();
  });

  test('e-mail repetido retorna 400', async () => {
    const res = await request(app).post('/v1/user').send(usuario);
    expect(res.status).toBe(400);
  });

  test('login com senha errada retorna 400', async () => {
    const res = await request(app).post('/v1/user/token').send({ email: usuario.email, password: 'errada' });
    expect(res.status).toBe(400);
  });

  test('buscar usuário: 200 se existe, 404 se não existe', async () => {
    expect((await request(app).get('/v1/user/1')).status).toBe(200);
    expect((await request(app).get('/v1/user/9999')).status).toBe(404);
  });

  test('PUT sem token retorna 401 e com token retorna 204', async () => {
    const dados = { firstname: 'Ana', surname: 'Souza', email: usuario.email };
    expect((await request(app).put('/v1/user/1').send(dados)).status).toBe(401);
    expect((await request(app).put('/v1/user/1').set('Authorization', auth).send(dados)).status).toBe(204);
  });
});

describe('Categorias', () => {
  test('criar sem token retorna 401', async () => {
    const res = await request(app).post('/v1/category').send({ name: 'Tênis', slug: 'tenis' });
    expect(res.status).toBe(401);
  });

  test('criar, buscar, listar com filtros, atualizar e apagar', async () => {
    const criada = await request(app).post('/v1/category').set('Authorization', auth)
      .send({ name: 'Tênis', slug: 'tenis', use_in_menu: true });
    expect(criada.status).toBe(201);
    const id = criada.body.id;

    expect((await request(app).get(`/v1/category/${id}`)).status).toBe(200);

    const lista = await request(app).get('/v1/category/search?limit=-1&use_in_menu=true&fields=name,slug');
    expect(lista.status).toBe(200);
    expect(lista.body.data[0]).toEqual({ name: 'Tênis', slug: 'tenis' });

    const novo = { name: 'Calçados', slug: 'calcados', use_in_menu: false };
    expect((await request(app).put(`/v1/category/${id}`).set('Authorization', auth).send(novo)).status).toBe(204);
    expect((await request(app).delete(`/v1/category/${id}`).set('Authorization', auth)).status).toBe(204);
    expect((await request(app).get(`/v1/category/${id}`)).status).toBe(404);
  });

  test('parâmetro inválido na busca retorna 400', async () => {
    expect((await request(app).get('/v1/category/search?limit=abc')).status).toBe(400);
  });
});

describe('Produtos', () => {
  let categoriaId;
  let produto;

  const corpo = () => ({
    enabled: true,
    name: 'Tênis K-Swiss',
    slug: 'tenis-k-swiss',
    stock: 10,
    description: 'Descrição',
    price: 119.9,
    price_with_discount: 99.9,
    category_ids: [categoriaId],
    images: [{ type: 'image/png', content: PNG }],
    options: [
      { title: 'Tamanho', shape: 'square', type: 'text', values: ['PP', 'GG'] },
      { title: 'Cor', shape: 'circle', radius: '4px', type: 'color', values: ['#000'] },
    ],
  });

  beforeAll(async () => {
    const cat = await request(app).post('/v1/category').set('Authorization', auth)
      .send({ name: 'Camisetas', slug: 'camisetas', use_in_menu: true });
    categoriaId = cat.body.id;
  });

  test('criar sem token retorna 401', async () => {
    expect((await request(app).post('/v1/product').send(corpo())).status).toBe(401);
  });

  test('criar com dados inválidos retorna 400', async () => {
    const res = await request(app).post('/v1/product').set('Authorization', auth).send({ name: 'sem preço' });
    expect(res.status).toBe(400);
  });

  test('criar com categoria inexistente retorna 400', async () => {
    const res = await request(app).post('/v1/product').set('Authorization', auth)
      .send({ ...corpo(), category_ids: [9999] });
    expect(res.status).toBe(400);
  });

  test('criar devolve imagens com URL e opções com id', async () => {
    const res = await request(app).post('/v1/product').set('Authorization', auth).send(corpo());
    expect(res.status).toBe(201);
    produto = res.body;
    expect(produto.images[0].content).toMatch(/^http.*\/media\/.+\.png$/);
    expect(produto.options).toHaveLength(2);
    expect(produto.options[1].radius).toBe(4); // "4px" vira o número 4
  });

  test('buscar por id: 200 e 404', async () => {
    expect((await request(app).get(`/v1/product/${produto.id}`)).status).toBe(200);
    expect((await request(app).get('/v1/product/9999')).status).toBe(404);
  });

  test('busca com match, faixa de preço, categoria e opção', async () => {
    const q = (s) => request(app).get(`/v1/product/search?${s}`);
    expect((await q('match=k-swiss')).body.total).toBe(1);
    expect((await q('match=nada-parecido')).body.total).toBe(0);
    expect((await q('price-range=100-200')).body.total).toBe(1);
    expect((await q('price-range=500-600')).body.total).toBe(0);
    expect((await q(`category_ids=${categoriaId}`)).body.total).toBe(1);
    expect((await q(`option[${produto.options[0].id}]=GG,XX`)).body.total).toBe(1);
    expect((await q(`option[${produto.options[0].id}]=ZZ`)).body.total).toBe(0);
  });

  test('PUT atualiza campos, apaga imagem/opção e adiciona novas', async () => {
    const dados = {
      ...corpo(),
      name: 'Tênis Novo',
      slug: 'tenis-novo',
      price: 150,
      price_with_discount: 0,
      images: [{ id: produto.images[0].id, deleted: true }, { type: 'image/png', content: PNG }],
      options: [
        { id: produto.options[0].id, values: ['M'] },
        { id: produto.options[1].id, deleted: true },
        { title: 'Novo', values: ['a', 'b'] },
      ],
    };
    const res = await request(app).put(`/v1/product/${produto.id}`).set('Authorization', auth).send(dados);
    expect(res.status).toBe(204);

    const { body } = await request(app).get(`/v1/product/${produto.id}`);
    expect(body.name).toBe('Tênis Novo');
    expect(body.images).toHaveLength(1);
    expect(body.options.map((o) => o.title).sort()).toEqual(['Novo', 'Tamanho']);
    expect(body.options.find((o) => o.title === 'Tamanho').values).toEqual(['M']);
  });

  test('apagar produto retorna 204 e depois 404', async () => {
    expect((await request(app).delete(`/v1/product/${produto.id}`).set('Authorization', auth)).status).toBe(204);
    expect((await request(app).get(`/v1/product/${produto.id}`)).status).toBe(404);
  });
});
