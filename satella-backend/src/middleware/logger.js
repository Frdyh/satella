function logger(req, _res, next) {
  const timestamp = new Date().toISOString();
  // Oculta secretos que pueden venir en la URL: el token de sesión (links de PDF)
  // y el verify token de la verificación del webhook de WhatsApp.
  const url = req.url.replace(/([?&](?:token|hub\.verify_token)=)[^&]*/g, '$1***');
  console.log(`[${timestamp}] ${req.method} ${url}`);
  next();
}

module.exports = logger;
