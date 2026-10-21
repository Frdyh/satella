const { Router } = require('express');
const verifyMetaSignature = require('../middleware/verifyMetaSignature');
const requireAuth = require('../middleware/requireAuth');
const controller = require('../controllers/whatsappController');

const router = Router();

// Webhook de Meta: público (Meta no inicia sesión), protegido por el
// verify token (GET) y por la firma HMAC del cuerpo (POST).
router.get('/webhook', controller.verificar);
router.post('/webhook', verifyMetaSignature, controller.recibir);

// Simulador: permite escribir "como" cualquier teléfono, así que solo existe
// con ENABLE_WA_SIMULATOR=true y además exige sesión del personal.
if (process.env.ENABLE_WA_SIMULATOR === 'true') {
  router.post('/simulador', requireAuth, controller.simular);
}

module.exports = router;
