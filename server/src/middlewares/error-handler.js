import { AppError } from '../shared/errors.js';

export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.fields ? { fields: err.fields } : {})
      }
    });
  }

  // Zod validation error fallback
  if (err?.name === 'ZodError') {
    const fields = {};
    for (const issue of err.issues || []) {
      const path = issue.path.join('.');
      fields[path] = issue.message;
    }
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu nhập vào không hợp lệ',
        fields
      }
    });
  }

  // Unhandled error
  console.error('Unhandled server error:', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Đã có lỗi xảy ra, vui lòng thử lại sau'
    }
  });
}
