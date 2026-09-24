export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (msg, details) => new AppError(400, msg, details);
export const unauthorized = (msg = 'unauthenticated') => new AppError(401, msg);
export const forbidden = (msg = 'forbidden') => new AppError(403, msg);
export const notFound = (msg = 'not found') => new AppError(404, msg);
export const conflict = (msg = 'conflict') => new AppError(409, msg);

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
