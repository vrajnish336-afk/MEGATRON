import { AppError } from '../../core/errors.js';
import { logger } from '../../core/logger.js';
import { ZodError } from 'zod';

export function errorHandler(err, req, res, next) {
  // If headers already sent, delegate to default express handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const formatted = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Input validation failed',
        details: formatted,
      }
    });
  }

  // Handle Domain AppError
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`Server Error: ${err.message}`, { error: err, path: req.path });
    }
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      }
    });
  }

  // Unhandled internal server error
  logger.error(`Unhandled Exception: ${err.message}`, { error: err.stack, path: req.path });
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred',
    }
  });
}
