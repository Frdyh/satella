function errorHandler(err, req, res, _next) {
  console.error(`[ERROR] ${err.message}`, err.stack);

  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Registro no encontrado' });
  }

  if (err.code === 'P2003') {
    return res.status(400).json({ error: 'Referencia inválida — el registro relacionado no existe' });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Ya existe un registro con ese valor único' });
  }

  const isProd = process.env.NODE_ENV === 'production';
  const status = err.status || 500;
  const message = (!isProd || status < 500) ? (err.message || 'Error interno del servidor') : 'Error interno del servidor';

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
