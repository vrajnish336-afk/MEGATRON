import { Router } from 'express';
import { z } from 'zod';
import { salesManagerAgent } from '../../agents/salesManagerAgent.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { PERMISSIONS } from '../../permissions/permissionsMatrix.js';
import { NotFoundError } from '../../core/errors.js';

const router = Router();
router.use(authenticate);

const ExplainQuerySchema = z.object({
  query: z.string().min(1).max(1000).optional(),
  lead_id: z.string().optional(),
  leadId: z.string().optional(),
});

/**
 * GET /api/sales/priorities
 * Returns ranked customer priorities for the organization
 */
router.get('/priorities', requirePermission(PERMISSIONS.LEAD_READ), async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const result = await salesManagerAgent.getPriorities(req.user.orgId, { limit });
    res.json({
      success: true,
      data: result.priorities,
      total: result.total,
      topPriorities: result.topPriorities,
      summary: result.summary,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/sales/priorities/:leadId
 * Returns detailed priority breakdown and score calculation for a specific lead
 */
router.get('/priorities/:leadId', requirePermission(PERMISSIONS.LEAD_READ), async (req, res, next) => {
  try {
    const result = await salesManagerAgent.getLeadPriority(req.params.leadId, req.user.orgId);
    if (!result) {
      throw new NotFoundError(`Lead with ID '${req.params.leadId}'`);
    }
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/sales/daily-plan
 * Returns daily sales plan grouped by priority tiers (URGENT, HIGH, MEDIUM, LOW)
 */
router.get('/daily-plan', requirePermission(PERMISSIONS.LEAD_READ), async (req, res, next) => {
  try {
    const result = await salesManagerAgent.getDailyPlan(req.user.orgId);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/sales/explain
 * AI-powered explanation of sales priorities grounded strictly in live database records
 */
router.post('/explain', requirePermission(PERMISSIONS.AI_USE), async (req, res, next) => {
  try {
    const data = ExplainQuerySchema.parse(req.body || {});
    const leadId = data.lead_id || data.leadId || null;
    const query = data.query || 'Who should our sales team focus on today, and why?';

    const result = await salesManagerAgent.explainPriorities({
      query,
      leadId,
      orgId: req.user.orgId,
      user: req.user,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
