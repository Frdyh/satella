/**
 * Middleware de parámetro de ruta: valida que ':id' sea un entero positivo
 * antes de que la petición llegue al controller. Se registra con
 * `router.param('id', validateId)` en cada archivo de rutas.
 */
function validateId(req, res, next, id) {
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    return res.status(400).json({ error: 'Id inválido' });
  }
  req.params.id = numId;
  next();
}

module.exports = validateId;
