import { Router } from 'express';
import { auditRepo } from '../../database/repositories/auditRepo.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { PERMISSIONS } from '../../permissions/permissionsMatrix.js';

const router = Router();
router.use(authenticate);

// Get Organization Activity / Audit Log
router.get('/', requirePermission(PERMISSIONS.AUDIT_READ), (req, res, next) => {
  try {
    const { action, resourceType, limit, offset } = req.query;
    const logs = auditRepo.listByOrg(req.user.orgId, {
      action,
      resourceType,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
});

export default router;
