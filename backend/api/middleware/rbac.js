import { hasPermission } from '../../permissions/policyEvaluator.js';
import { hasRoleLevel } from '../../permissions/roles.js';
import { ForbiddenError, UnauthorizedError } from '../../core/errors.js';

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (!hasPermission(req.user.role, permission)) {
      return next(new ForbiddenError(`Missing required permission: ${permission}`));
    }

    next();
  };
}

export function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (!hasRoleLevel(req.user.role, requiredRole)) {
      return next(new ForbiddenError(`Requires at least ${requiredRole} role`));
    }

    next();
  };
}
