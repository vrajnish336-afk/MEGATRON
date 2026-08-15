import { Router } from 'express';
import { z } from 'zod';
import { orgRepo } from '../../database/repositories/orgRepo.js';
import { auditRepo } from '../../database/repositories/auditRepo.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { PERMISSIONS } from '../../permissions/permissionsMatrix.js';
import { NotFoundError } from '../../core/errors.js';

const router = Router();
router.use(authenticate);

const UpdateOrgSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  plan: z.string().min(2).max(50).optional(),
  settings: z.record(z.any()).optional(),
});

// Get caller's Organization details
router.get('/current', requirePermission(PERMISSIONS.ORG_READ), (req, res, next) => {
  try {
    const org = orgRepo.findById(req.user.orgId);
    if (!org) throw new NotFoundError('Organization');
    res.json({ success: true, data: org });
  } catch (err) {
    next(err);
  }
});

// Update Organization settings / details
router.patch('/current', requirePermission(PERMISSIONS.ORG_UPDATE), (req, res, next) => {
  try {
    const data = UpdateOrgSchema.parse(req.body);
    const updated = orgRepo.update(req.user.orgId, data);

    auditRepo.create({
      orgId: req.user.orgId,
      userId: req.user.id,
      action: 'ORGANIZATION_UPDATED',
      resourceType: 'ORGANIZATION',
      resourceId: req.user.orgId,
      details: data,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
