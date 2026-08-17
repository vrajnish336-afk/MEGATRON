import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { PERMISSIONS } from '../../permissions/permissionsMatrix.js';
import { businessOperationsAgent } from '../../agents/businessOperationsAgent.js';
import { BadRequestError } from '../../core/errors.js';

const router = Router();
router.use(authenticate);

const ExplainSchema = z.object({
  query: z.string().optional().default(''),
});

/**
 * GET /api/operations/health
 * Returns MEGATRON Operational Health Index (0-100) and component breakdown
 */
router.get('/health', requirePermission(PERMISSIONS.LEAD_READ), async (req, res, next) => {
  try {
    const health = businessOperationsAgent.calculateOperationalHealth(req.user.orgId);
    res.json({
      success: true,
      data: health,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/operations/executive-plan
 * Returns 4-Quadrant Daily Executive Action Plan
 */
router.get('/executive-plan', requirePermission(PERMISSIONS.LEAD_READ), async (req, res, next) => {
  try {
    const plan = businessOperationsAgent.getDailyExecutivePlan(req.user.orgId);
    res.json({
      success: true,
      data: plan,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/operations/opportunities
 * Returns Opportunity & Risk Radar (stalled deals, SLA breaches, unassigned VIPs, high velocity buyers)
 */
router.get('/opportunities', requirePermission(PERMISSIONS.LEAD_READ), async (req, res, next) => {
  try {
    const radar = businessOperationsAgent.detectOpportunitiesAndRisks(req.user.orgId);
    res.json({
      success: true,
      data: radar,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/operations/brief
 * Returns CEO Daily Brief with live ground-truth telemetry
 */
router.get('/brief', requirePermission(PERMISSIONS.LEAD_READ), async (req, res, next) => {
  try {
    const brief = await businessOperationsAgent.getCeoBrief(req.user.orgId, { user: req.user });
    res.json({
      success: true,
      data: brief,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/operations/alerts
 * Returns Proactive Operational Alerts (CRITICAL, WARNING, INFO)
 */
router.get('/alerts', requirePermission(PERMISSIONS.LEAD_READ), async (req, res, next) => {
  try {
    const alerts = businessOperationsAgent.getProactiveAlerts(req.user.orgId);
    res.json({
      success: true,
      data: {
        alerts,
        total: alerts.length,
        criticalCount: alerts.filter(a => a.severity === 'CRITICAL').length,
        warningCount: alerts.filter(a => a.severity === 'WARNING').length,
        infoCount: alerts.filter(a => a.severity === 'INFO').length,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/operations/explain
 * Conversational operations Q&A grounded strictly in database facts
 */
router.post('/explain', requirePermission(PERMISSIONS.AI_USE), async (req, res, next) => {
  try {
    const parsed = ExplainSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError('Invalid query format', parsed.error.issues);
    }

    const result = await businessOperationsAgent.explainOperations({
      query: parsed.data.query,
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
