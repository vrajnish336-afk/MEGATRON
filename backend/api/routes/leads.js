import { Router } from 'express';
import { z } from 'zod';
import { leadRepo, LEAD_STATUSES, PRIORITIES } from '../../database/repositories/leadRepo.js';
import { auditRepo } from '../../database/repositories/auditRepo.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { PERMISSIONS } from '../../permissions/permissionsMatrix.js';
import { NotFoundError } from '../../core/errors.js';

const router = Router();
router.use(authenticate);

const CreateLeadSchema = z.object({
  name: z.string().min(1).max(100),
  company: z.string().max(100).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().max(30).optional().nullable(),
  source: z.string().max(50).default('DIRECT'),
  status: z.enum(LEAD_STATUSES).default('NEW'),
  priority: z.enum(PRIORITIES).default('MEDIUM'),
  notes: z.string().optional().nullable(),
  nextFollowup: z.string().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  aiClassification: z.string().optional().nullable(),
  aiSuggestedAction: z.string().optional().nullable(),
  // Real Estate Optional Fields
  propertyType: z.string().optional().nullable(),
  budgetMin: z.number().optional().nullable(),
  budgetMax: z.number().optional().nullable(),
  preferredLocation: z.string().optional().nullable(),
  bedrooms: z.number().int().optional().nullable(),
  purpose: z.string().optional().nullable(),
  buyOrRent: z.string().optional().nullable(),
  siteVisitDate: z.string().optional().nullable(),
  leadSource: z.string().optional().nullable(),
  preferredContactTime: z.string().optional().nullable(),
});

const UpdateLeadSchema = CreateLeadSchema.partial();

// List Leads
router.get('/', requirePermission(PERMISSIONS.LEAD_READ), (req, res, next) => {
  try {
    const { status, priority, assignedTo, propertyType, preferredLocation, buyOrRent, search, limit, offset } = req.query;
    const leads = leadRepo.listByOrg(req.user.orgId, {
      status,
      priority,
      assignedTo,
      propertyType,
      preferredLocation,
      buyOrRent,
      search,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    res.json({ success: true, data: leads });
  } catch (err) {
    next(err);
  }
});

// Lead Stats
router.get('/stats', requirePermission(PERMISSIONS.LEAD_READ), (req, res, next) => {
  try {
    const stats = leadRepo.getStats(req.user.orgId);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

// Follow-ups Needing Attention (Real Estate Prioritization)
router.get('/attention', requirePermission(PERMISSIONS.LEAD_READ), (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
    const leads = leadRepo.getFollowupsNeedingAttention(req.user.orgId, limit);
    res.json({ success: true, data: leads });
  } catch (err) {
    next(err);
  }
});

// Site Visits Scheduled
router.get('/site-visits', requirePermission(PERMISSIONS.LEAD_READ), (req, res, next) => {
  try {
    const todayVisits = leadRepo.getSiteVisitsToday(req.user.orgId);
    const upcomingVisits = leadRepo.getUpcomingSiteVisits(req.user.orgId, 7);
    res.json({
      success: true,
      data: {
        today: todayVisits,
        upcoming: upcomingVisits,
      }
    });
  } catch (err) {
    next(err);
  }
});

// Upcoming & Overdue followups
router.get('/followups', requirePermission(PERMISSIONS.LEAD_READ), (req, res, next) => {
  try {
    const upcoming = leadRepo.getUpcomingFollowups(req.user.orgId, 7);
    const overdue = leadRepo.getOverdueFollowups(req.user.orgId);
    res.json({ success: true, data: { upcoming, overdue } });
  } catch (err) {
    next(err);
  }
});

// Get Single Lead
router.get('/:id', requirePermission(PERMISSIONS.LEAD_READ), (req, res, next) => {
  try {
    const lead = leadRepo.findById(req.params.id, req.user.orgId);
    if (!lead) throw new NotFoundError('Lead');
    res.json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
});

// Create Lead
router.post('/', requirePermission(PERMISSIONS.LEAD_CREATE), (req, res, next) => {
  try {
    const data = CreateLeadSchema.parse(req.body);
    const lead = leadRepo.create({
      orgId: req.user.orgId,
      ...data,
    });

    auditRepo.create({
      orgId: req.user.orgId,
      userId: req.user.id,
      action: 'LEAD_CREATED',
      resourceType: 'LEAD',
      resourceId: lead.id,
      details: {
        name: lead.name,
        propertyType: lead.property_type,
        location: lead.preferred_location,
        status: lead.status,
      },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
});

// Update Lead
router.patch('/:id', requirePermission(PERMISSIONS.LEAD_UPDATE), (req, res, next) => {
  try {
    const data = UpdateLeadSchema.parse(req.body);
    const updated = leadRepo.update(req.params.id, req.user.orgId, data);
    if (!updated) throw new NotFoundError('Lead');

    auditRepo.create({
      orgId: req.user.orgId,
      userId: req.user.id,
      action: 'LEAD_UPDATED',
      resourceType: 'LEAD',
      resourceId: updated.id,
      details: data,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// Delete Lead
router.delete('/:id', requirePermission(PERMISSIONS.LEAD_DELETE), (req, res, next) => {
  try {
    const lead = leadRepo.findById(req.params.id, req.user.orgId);
    if (!lead) throw new NotFoundError('Lead');

    leadRepo.delete(req.params.id, req.user.orgId);

    auditRepo.create({
      orgId: req.user.orgId,
      userId: req.user.id,
      action: 'LEAD_DELETED',
      resourceType: 'LEAD',
      resourceId: req.params.id,
      details: { name: lead.name },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
