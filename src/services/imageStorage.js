// Imagens chegam em base64 e são armazenadas no uplouds/media, então o banco guarda apenas o caminho relativo
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = path.resolve(__dirname, '..', '..', 'uploads');

const EXTENSIONS = {
    'image/png': 'png',
    'image/jpg': 'jpg',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
};

// No PUT do projeto a imagem pode vir sem "type", em que pode ser descoberto pelos primeiros bytes
function sniffExtension(buffer) {
    if (buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) return 'png';
    if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'jpg';
    if (buffer.subarray(0, 4).toString('ascii') === 'GIF8') return 'gif';
    if (
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    ) return 'webp';
    return null;
}

// Devolve { extension, buffer } ou null se não for uma imagem base64 válida
function parseImage({ type, content }) {
    if (typeof content !== 'string') return null;

    const base64 = content.replace(/^data:[^;]+;base64,/, '');
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return null;

    const buffer = Buffer.from(base64, 'base64');
    const extension = EXTENSIONS[type] || sniffExtension(buffer);
    return extension ? { extension, buffer } : null;
}

// Salva o arquivo e devolve o caminho relativo, ex.: media/3f2a....png
async function save(image) {
    const { extension, buffer } = parseImage(image);
    const relativePath = `media/${crypto.randomUUID()}.${extension}`;
    const fullPath = path.join(UPLOAD_DIR, relativePath);

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);
    return relativePath;
}

async function remove(relativePath) {
    await fs.rm(path.join(UPLOAD_DIR, relativePath), { force: true });
}

module.exports = { UPLOAD_DIR, parseImage, save, remove };