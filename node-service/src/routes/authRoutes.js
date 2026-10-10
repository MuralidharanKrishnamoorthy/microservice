const { Router } = require('express');
const authController = require('../controllers/authController');
const { rateLimit } = require('../middleware/rateLimitMiddleware');

const router = Router();

router.post('/register', rateLimit, authController.register);
router.post('/login', rateLimit, authController.login);

module.exports = router;
