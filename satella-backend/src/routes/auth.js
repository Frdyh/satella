const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const requireAuth = require('../middleware/requireAuth');
const controller = require('../controllers/authController');

const router = Router();

// Límite estricto para frenar ataques de fuerza bruta sobre el login.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en unos minutos.' },
});

router.post('/login', loginLimiter, controller.login);
router.get('/me', requireAuth, controller.me);

module.exports = router;
