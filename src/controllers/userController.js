const userService = require('../services/userService');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isFilled = (value) => typeof value === 'string' && value.trim() !== '';

function validProfile({ firstname, surname, email }) {
    return isFilled(firstname) && isFilled(surname) && isFilled(email) && EMAIL_REGEX.test(email);
}

exports.getById = async (req, res) => {
    const user = await userService.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    return res.status(200).json(user);
};

exports.create = async (req, res) => {
    const { password, confirmPassword } = req.body;

    if (!validProfile(req.body) || !isFilled(password) || password !== confirmPassword) {
        return res.status(400).json({ message: 'Dados inválidos' });
    }
    if (await userService.emailInUse(req.body.email)) {
        return res.status(400).json({ message: 'E-mail já cadastrado' });
    }

    const user = await userService.create(req.body);
    return res.status(201).json(user);
};

exports.update = async (req, res) => {
    if (!validProfile(req.body)) {
        return res.status(400).json({ message: 'Dados inválidos' });
    }
    if (await userService.emailInUse(req.body.email, req.params.id)) {
        return res.status(400).json({ message: 'E-mail já cadastrado' });
    }

    const user = await userService.update(req.params.id, req.body);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    return res.status(204).send();
};

exports.remove = async (req, res) => {
    const deleted = await userService.remove(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Usuário não encontrado' });
    return res.status(204).send();
};

exports.token = async (req, res) => {
    const { email, password } = req.body;

    if (!isFilled(email) || !isFilled(password)) {
        return res.status(400).json({ message: 'Dados inválidos' });
    }

    const token = await userService.generateToken(email, password);
    if (!token) return res.status(400).json({ message: 'E-mail ou senha incorretos' });
    return res.status(200).json({ token });
};