// Criação de error com status HTTP e o arquivo app.js converte em resposta
module.exports = (status, message) => Object.assign(new Error(message), { status });