# Digital Store - API (Back End)

API REST da Digital Store, loja virtual de produtos. Ela gerencia **usuários**, **categorias** e **produtos** (com imagens, opções e vínculo com categorias), com autenticação por token JWT.

Projeto final do módulo de Back End.

## Tecnologias

- Node.js e Express
- MySQL com Sequelize (ORM) e migrations
- JWT (`jsonwebtoken`) para autenticação e `bcrypt` para o hash das senhas
- Swagger (`swagger-ui-express`) para a documentação da API
- Jest e Supertest (ferramentas de teste)

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18 ou superior (versão LTS)
- [MySQL](https://dev.mysql.com/downloads/) 8 instalado e rodando
- Git

## Como rodar o projeto

**1. Clone o repositório e entre na pasta**

```bash
git clone https://github.com/mil-dsm/digital-store-back-end.git
cd digital-store-back-end
```

**2. Instale as dependências**

```bash
npm install
```

**3. Crie o banco de dados**

Abra o MySQL (`mysql -u root -p`) e execute:

```sql
CREATE DATABASE digital_store CHARACTER SET utf8mb4;
```

**4. Configure as variáveis de ambiente**

Copie o arquivo de exemplo para `.env`:

```bash
# Linux / Mac
cp .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env
```

Abra o `.env` e preencha os valores:

| Variável | Descrição | Exemplo |
|---|---|---|
| `PORT` | Porta da API | `3000` |
| `DB_HOST` | Endereço do MySQL | `localhost` |
| `DB_PORT` | Porta do MySQL | `3306` |
| `DB_NAME` | Nome do banco | `digital_store` |
| `DB_USER` | Usuário do MySQL | `root` |
| `DB_PASSWORD` | Senha do MySQL | `sua_senha` |
| `JWT_SECRET` | Frase secreta usada para assinar os tokens | uma frase longa e aleatória |

**5. Crie as tabelas (migrations)**

```bash
npx sequelize-cli db:migrate
```

Isso cria as tabelas `users`, `categories`, `products`, `product_images`, `product_options` e `product_categories`.

**6. Inicie o servidor**

```bash
npm run dev     # desenvolvimento, reinicia ao salvar (nodemon)
npm start       # execução normal
```

No terminal devem aparecer as mensagens `Conectado ao MySQL` e `API rodando na porta 3000`.

Para conferir, abra `http://localhost:3000/health` no navegador. A resposta esperada é `{"status":"ok"}`.

## Documentação da API (Swagger)

Com o servidor rodando, a documentação interativa fica em:

**http://localhost:3000/docs**

Nela é possível ver todos os endpoints e testá-los pelo navegador (botão **Try it out**).

Para testar as rotas protegidas:

1. Em `POST /v1/user/token`, faça login e copie o `token` da resposta.
2. Clique em **Authorize**, cole apenas o token (sem escrever `Bearer`) e confirme.

## Autenticação

As rotas que criam, alteram ou apagam dados exigem o cabeçalho:

```
Authorization: Bearer <token>
```

O token é obtido em `POST /v1/user/token` e expira em 1 hora. Sem token, ou com token inválido, a API responde `401 Unauthorized`.

## Endpoints

| Método | Rota | Descrição | Token |
|---|---|---|---|
| POST | `/v1/user` | Cadastrar usuário | não |
| POST | `/v1/user/token` | Gerar token JWT (login) | não |
| GET | `/v1/user/:id` | Buscar usuário | não |
| PUT | `/v1/user/:id` | Atualizar usuário | sim |
| DELETE | `/v1/user/:id` | Deletar usuário | sim |
| GET | `/v1/category/search` | Listar categorias (paginação e filtros) | não |
| GET | `/v1/category/:id` | Buscar categoria | não |
| POST | `/v1/category` | Criar categoria | sim |
| PUT | `/v1/category/:id` | Atualizar categoria | sim |
| DELETE | `/v1/category/:id` | Deletar categoria | sim |
| GET | `/v1/product/search` | Listar produtos (paginação e filtros) | não |
| GET | `/v1/product/:id` | Buscar produto | não |
| POST | `/v1/product` | Criar produto | sim |
| PUT | `/v1/product/:id` | Atualizar produto | sim |
| DELETE | `/v1/product/:id` | Deletar produto | sim |

### Parâmetros das buscas

Parâmetros de `GET /v1/category/search`:

- `limit`: itens por página (padrão 12; `-1` retorna todos)
- `page`: página (padrão 1)
- `fields`: campos a retornar, separados por vírgula (ex.: `name,slug`)
- `use_in_menu`: `true` ou `false`

Parâmetros de `GET /v1/product/search` (além de `limit`, `page` e `fields`):

- `match`: termo que combine com o nome ou a descrição
- `category_ids`: ids de categorias separados por vírgula (ex.: `1,2`)
- `price-range`: faixa de preço `min-max` (ex.: `100-200`), aplicada sobre o campo `price`
- `option[ID]`: valores de uma opção separados por vírgula (ex.: `option[45]=GG,PP`)

Requisições com parâmetros inválidos retornam `400 Bad Request`.

### Imagens dos produtos

Ao criar ou atualizar um produto, as imagens são enviadas em **base64**. O servidor salva os arquivos na pasta `uploads/media` e guarda no banco apenas o caminho relativo. Nas respostas, cada imagem vem com uma URL completa, como `http://localhost:3000/media/arquivo.png`.

A pasta `uploads` não é versionada no Git.

## Estrutura do projeto

```
src/
  config/        configuração do Sequelize e conexão com o banco
  controllers/   recebem a requisição e devolvem a resposta HTTP
  services/      regras de negócio e acesso ao banco
  models/        models do Sequelize e associações
  migrations/    criação das tabelas
  middleware/    autenticação JWT, validação e tratamento de erros assíncronos
  routes/        definição das rotas
  docs/          documentação Swagger
  utils/         funções auxiliares
  app.js         configuração do Express
  server.js      inicialização do servidor
```

O projeto segue uma organização em camadas, no estilo MVC: as rotas chamam os controllers, que usam os services, que acessam os models.

## Possíveis problemas

- **`Access denied for user 'root'`**: a senha em `DB_PASSWORD` do `.env` está errada.
- **`Unknown database 'digital_store'`**: o banco não foi criado (passo 3).
- **`ECONNREFUSED`**: o MySQL não está rodando.
- **`Table ... doesn't exist`**: faltou rodar as migrations (passo 5).
- **Erro ao carregar o `bcrypt`**: rode `npm rebuild bcrypt`.

## Autoria

Milena de Sousa Mesquita