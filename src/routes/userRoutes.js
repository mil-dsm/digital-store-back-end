const router = require('express').Router();
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const controller = require('../controllers/userController');

router.post('/token', asyncHandler(controller.token));
router.post('/', asyncHandler(controller.create));
router.get('/:id', asyncHandler(controller.getById));
router.put('/:id', auth, asyncHandler(controller.update));
router.delete('/:id', auth, asyncHandler(controller.remove));

module.exports = router;