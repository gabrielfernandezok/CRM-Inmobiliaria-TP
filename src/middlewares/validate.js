function spanishIssueMessage(issue) {
  if (issue.code === 'custom') return issue.message;
  if (issue.code === 'invalid_type') {
    return issue.received === 'undefined'
      ? 'El campo es obligatorio'
      : 'El tipo de dato no es válido';
  }
  if (issue.code === 'invalid_enum_value' || issue.code === 'invalid_literal') {
    return 'El valor seleccionado no es válido';
  }
  if (issue.code === 'invalid_string') {
    if (issue.validation === 'email') return 'El formato del correo electrónico no es válido';
    if (issue.validation === 'datetime') return 'La fecha y hora no es válida';
    if (issue.validation === 'regex') return 'El formato del valor no es válido';
    return 'El texto no tiene un formato válido';
  }
  if (issue.code === 'too_small') return 'El valor es menor al mínimo permitido';
  if (issue.code === 'too_big') return 'El valor supera el máximo permitido';
  if (issue.code === 'invalid_union') return 'El valor no tiene un formato válido';
  return 'El valor no es válido';
}

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: 'Datos inválidos',
        errors: result.error.errors.map((issue) => ({
          ...issue,
          message: spanishIssueMessage(issue),
        })),
      });
    }

    req.body = result.data;
    return next();
  };
}

module.exports = { validate, spanishIssueMessage };
