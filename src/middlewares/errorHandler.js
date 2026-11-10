function errorHandler(err, req, res, next) {
  if (err && err.statusCode) {
    return res.status(err.statusCode).json({
      message: err.message,
    });
  }

  if (err && err.name === 'ZodError') {
    return res.status(400).json({
      message: 'Datos inválidos',
      errors: err.issues,
    });
  }

  console.error(err);

  return res.status(500).json({
    message: 'Error interno del servidor',
  });
}

module.exports = { errorHandler };
