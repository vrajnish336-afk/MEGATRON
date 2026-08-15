import { Router } from 'express';
import { z } from 'zod';
import { userRepo } from '../../database/repositories/userRepo.js';
import { auditRepo } from '../../database/repositories/auditRepo.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { PERMISSIONS } from '../../permissions/permissionsMatrix.js';
import { ROLES } from '../../permissions/roles.js';
import { hashPassword } from '../../security/crypto.js';
import { NotFoundError, ConflictError, ForbiddenError } from '../../core/errors.js';

const router = Router();
router.use(authenticate);

const CreateUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum([ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE, ROLES.VIEWER]),
});

const UpdateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.enum([ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE, ROLES.VIEWER]).optional(),
  isActive: z.boolean().optional(),
});

// List users in caller's organization
router.get('/', requirePermission(PERMISSIONS.USER_READ), (req, res, next) => {
  try {
    const users = userRepo.findByOrg(req.user.orgId);
    res.json({
      success: true,
      data: users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: Boolean(u.is_active),
        createdAt: u.created_at,
      }))
    });
  } catch (err) {
    next(err);
  }
});

// Create new user in organization
router.post('/', requirePermission(PERMISSIONS.USER_CREATE), async (req, res, next) => {
  try {
    const data = CreateUserSchema.parse(req.body);

    const existing = userRepo.findByEmail(data.email);
    if (existing) {
      throw new ConflictError('A user with this email already exists');
    }

    const passwordHash = await hashPassword(data.password);
    const user = userRepo.create({
      orgId: req.user.orgId,
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
    });

    auditRepo.create({
      orgId: req.user.orgId,
      userId: req.user.id,
      action: 'USER_CREATED',
      resourceType: 'USER',
      resourceId: user.id,
      details: { name: user.name, email: user.email, role: user.role },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: true,
        createdAt: user.created_at,
      }
    });
  } catch (err) {
    next(err);
  }
});

// Update user
router.patch('/:id', requirePermission(PERMISSIONS.USER_UPDATE), (req, res, next) => {
  try {
    const data = UpdateUserSchema.parse(req.body);
    const targetUser = userRepo.findById(req.params.id);

    if (!targetUser || targetUser.org_id !== req.user.orgId) {
      throw new NotFoundError('User');
    }

    // Owner cannot be demoted or deactivated by others
    if (targetUser.role === ROLES.OWNER && req.user.id !== targetUser.id) {
      throw new ForbiddenError('Cannot modify organization owner account');
    }

    const updated = userRepo.update(targetUser.id, data);

    auditRepo.create({
      orgId: req.user.orgId,
      userId: req.user.id,
      action: 'USER_UPDATED',
      resourceType: 'USER',
      resourceId: targetUser.id,
      details: data,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        isActive: Boolean(updated.is_active),
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
