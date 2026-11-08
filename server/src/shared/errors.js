export class AppError extends Error {
  constructor(code, statusCode, message, fields = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.fields = fields;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const createBadRequest = (message, code = 'BAD_REQUEST', fields = null) =>
  new AppError(code, 400, message, fields);

export const createUnauthorized = (message = 'Yêu cầu đăng nhập để tiếp tục') =>
  new AppError('UNAUTHORIZED', 401, message);

export const createForbidden = (message = 'Bạn không có quyền thực hiện thao tác này') =>
  new AppError('FORBIDDEN', 403, message);

export const createNotFound = (message = 'Không tìm thấy dữ liệu yêu cầu') =>
  new AppError('NOT_FOUND', 404, message);

export const createConflict = (message, code = 'CONFLICT') =>
  new AppError(code, 409, message);
