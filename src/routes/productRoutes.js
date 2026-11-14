const router = require('express').Router();
const auth = require('../middleware/auth');
const validateProduct = require('../middleware/validateProduct');
const asyncHandler = require('../middleware/asyncHandler');
const controller = require('../controllers/productController');

// /search antes de /:id
router.get('/search', asyncHandler(controller.search));
router.get('/:id', asyncHandler(controller.getById));
router.post('/', auth, validateProduct, asyncHandler(controller.create));
router.put('/:id', auth, validateProduct, asyncHandler(controller.update));
router.delete('/:id', auth, asyncHandler(controller.remove));

module.exports = router;