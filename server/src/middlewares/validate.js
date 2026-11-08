export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fields = {};
      for (const issue of result.error.issues) {
        fields[issue.path.join('.')] = issue.message;
      }
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dữ liệu nhập vào không hợp lệ',
          fields
        }
      });
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const fields = {};
      for (const issue of result.error.issues) {
        fields[issue.path.join('.')] = issue.message;
      }
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Tham số tìm kiếm không hợp lệ',
          fields
        }
      });
    }
    req.query = result.data;
    next();
  };
}
