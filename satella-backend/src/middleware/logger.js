function logger(req, _res, next) {
  const timestamp = new Date().toISOString();
  // Oculta el token de sesión si viene en la URL (links de PDF) para no dejarlo en los logs.
  const url = req.url.replace(/([?&]token=)[^&]*/, '$1***');
  console.log(`[${timestamp}] ${req.method} ${url}`);
  next();
}

module.exports = logger;
