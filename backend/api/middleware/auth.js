import { verifyToken } from '../../security/crypto.js';
import { userRepo } from '../../database/repositories/userRepo.js';
import { orgRepo } from '../../database/repositories/orgRepo.js';
import { UnauthorizedError, ForbiddenError } from '../../core/errors.js';

export function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token missing or malformed');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      throw new UnauthorizedError('Invalid or expired authentication token');
    }

    const user = userRepo.findById(decoded.userId);
    if (!user || !user.is_active) {
      throw new UnauthorizedError('User account not found or inactive');
    }

    const org = orgRepo.findById(user.org_id);
    if (!org) {
      throw new ForbiddenError('Organization account is invalid or suspended');
    }

    req.user = {
      id: user.id,
      orgId: user.org_id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
    req.org = org;

    next();
  } catch (err) {
    next(err);
  }
}
