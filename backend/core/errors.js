/**
 * Standardized Domain Errors for MEGADRONE Business OS
 */

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details = null) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = null) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', details = null) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied: insufficient permissions', details = null) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', details = null) {
    super(`${resource} not found`, 404, 'NOT_FOUND', details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict occurred', details = null) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class GuardrailViolationError extends AppError {
  constructor(message = 'Action rejected by safety guardrails', details = null) {
    super(message, 403, 'GUARDRAIL_VIOLATION', details);
  }
}

export class ApprovalRequiredError extends AppError {
  constructor(approvalId, message = 'Action requires human approval', details = null) {
    super(message, 202, 'APPROVAL_REQUIRED', { approvalId, ...details });
  }
}

export class AIProviderError extends AppError {
  constructor(message = 'AI Provider error', details = null) {
    super(message, 502, 'AI_PROVIDER_ERROR', details);
  }
}
