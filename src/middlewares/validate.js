function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: 'Datos inválidos',
        errors: result.error.errors,
      });
    }

    req.body = result.data;
    return next();
  };
}

module.exports = { validate };
