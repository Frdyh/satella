const crypto = require('crypto');

/**
 * Verifica que el POST del webhook venga de verdad de Meta: el header
 * X-Hub-Signature-256 trae "sha256=<HMAC-SHA256 del cuerpo crudo con el app secret>".
 * Se calcula sobre los bytes exactos que llegaron (req.rawBody, capturado en
 * app.js), no sobre el JSON ya parseado: volver a serializarlo cambiaría la firma.
 */
function verifyMetaSignature(req, res, next) {
  const secret = process.env.WA_APP_SECRET;
  if (!secret) {
    console.error('[WhatsApp] Falta WA_APP_SECRET: se rechaza el webhook');
    return res.status(503).json({ error: 'Webhook de WhatsApp no configurado' });
  }

  const header = req.get('X-Hub-Signature-256') || '';
  if (!header.startsWith('sha256=') || !req.rawBody) {
    return res.status(401).json({ error: 'Firma inválida' });
  }

  const esperada = crypto.createHmac('sha256', secret).update(req.rawBody).digest();
  const recibida = Buffer.from(header.slice(7), 'hex');
  if (recibida.length !== esperada.length || !crypto.timingSafeEqual(recibida, esperada)) {
    return res.status(401).json({ error: 'Firma inválida' });
  }
  next();
}

module.exports = verifyMetaSignature;
