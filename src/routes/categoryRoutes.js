const router = require('express').Router();
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const controller = require('../controllers/categoryController');

// /search precisa vir antes de /:id, senão o Express considera "search" um id
router.get('/search', asyncHandler(controller.search));
router.get('/:id', asyncHandler(controller.getById));
router.post('/', auth, asyncHandler(controller.create));
router.put('/:id', auth, asyncHandler(controller.update));
router.delete('/:id', auth, asyncHandler(controller.remove));

module.exports = router;