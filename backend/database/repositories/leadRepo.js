import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';

export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export const leadRepo = {
  create({
    orgId,
    name,
    company = null,
    email = null,
    phone = null,
    source = 'DIRECT',
    status = 'NEW',
    priority = 'MEDIUM',
    notes = null,
    nextFollowup = null,
    assignedTo = null,
    aiClassification = null,
    aiSuggestedAction = null,
    propertyType = null,
    budgetMin = null,
    budgetMax = null,
    preferredLocation = null,
    bedrooms = null,
    purpose = null,
    buyOrRent = null,
    siteVisitDate = null,
    leadSource = null,
    preferredContactTime = null,
  }) {
    const id = `lead_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const now = new Date().toISOString();

    db.execute(
      `INSERT INTO leads (
        id, org_id, name, company, email, phone, source, status, priority, notes, next_followup, 
        assigned_to, ai_classification, ai_suggested_action, property_type, budget_min, budget_max, 
        preferred_location, bedrooms, purpose, buy_or_rent, site_visit_date, lead_source, 
        preferred_contact_time, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, orgId, name, company, email, phone, source, status, priority, notes, nextFollowup,
        assignedTo, aiClassification, aiSuggestedAction, propertyType, budgetMin, budgetMax,
        preferredLocation, bedrooms, purpose, buyOrRent, siteVisitDate, leadSource || source,
        preferredContactTime, now, now
      ]
    );

    return this.findById(id, orgId);
  },

  findById(id, orgId) {
    let sql = `SELECT l.*, u.name as assigned_to_name, u.email as assigned_to_email 
               FROM leads l 
               LEFT JOIN users u ON l.assigned_to = u.id 
               WHERE l.id = ?`;
    const params = [id];
    if (orgId) {
      sql += ` AND l.org_id = ?`;
      params.push(orgId);
    }
    return db.queryOne(sql, params);
  },

  listByOrg(orgId, {
    status = null,
    priority = null,
    assignedTo = null,
    propertyType = null,
    preferredLocation = null,
    buyOrRent = null,
    search = null,
    limit = 100,
    offset = 0
  } = {}) {
    let sql = `SELECT l.*, u.name as assigned_to_name 
               FROM leads l 
               LEFT JOIN users u ON l.assigned_to = u.id 
               WHERE l.org_id = ?`;
    const params = [orgId];

    if (status) {
      sql += ` AND l.status = ?`;
      params.push(status);
    }
    if (priority) {
      sql += ` AND l.priority = ?`;
      params.push(priority);
    }
    if (assignedTo) {
      sql += ` AND l.assigned_to = ?`;
      params.push(assignedTo);
    }
    if (propertyType) {
      sql += ` AND l.property_type = ?`;
      params.push(propertyType);
    }
    if (preferredLocation) {
      sql += ` AND l.preferred_location LIKE ?`;
      params.push(`%${preferredLocation}%`);
    }
    if (buyOrRent) {
      sql += ` AND l.buy_or_rent = ?`;
      params.push(buyOrRent);
    }
    if (search) {
      sql += ` AND (l.name LIKE ? OR l.company LIKE ? OR l.email LIKE ? OR l.preferred_location LIKE ? OR l.property_type LIKE ?)`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    sql += ` ORDER BY l.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return db.queryAll(sql, params);
  },

  update(id, orgId, fields) {
    const existing = this.findById(id, orgId);
    if (!existing) return null;

    const allowed = [
      'name', 'company', 'email', 'phone', 'source', 'status', 'priority', 'notes',
      'next_followup', 'assigned_to', 'ai_classification', 'ai_suggested_action',
      'property_type', 'budget_min', 'budget_max', 'preferred_location', 'bedrooms',
      'purpose', 'buy_or_rent', 'site_visit_date', 'lead_source', 'preferred_contact_time'
    ];
    const updates = [];
    const params = [];

    for (const key of allowed) {
      const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      const val = fields[camel] !== undefined ? fields[camel] : fields[key];
      if (val !== undefined) {
        updates.push(`${key} = ?`);
        params.push(val);
      }
    }

    if (updates.length === 0) return existing;

    const now = new Date().toISOString();
    updates.push(`updated_at = ?`);
    params.push(now);

    params.push(id, orgId);
    db.execute(`UPDATE leads SET ${updates.join(', ')} WHERE id = ? AND org_id = ?`, params);

    return this.findById(id, orgId);
  },

  delete(id, orgId) {
    return db.execute(`DELETE FROM leads WHERE id = ? AND org_id = ?`, [id, orgId]);
  },

  getStats(orgId) {
    const totalLeads = db.queryOne(`SELECT COUNT(*) as count FROM leads WHERE org_id = ?`, [orgId])?.count || 0;
    const byStatus = db.queryAll(`SELECT status, COUNT(*) as count FROM leads WHERE org_id = ? GROUP BY status`, [orgId]);
    const byPriority = db.queryAll(`SELECT priority, COUNT(*) as count FROM leads WHERE org_id = ? GROUP BY priority`, [orgId]);

    const statusCounts = {};
    for (const s of LEAD_STATUSES) statusCounts[s] = 0;
    for (const row of byStatus) statusCounts[row.status] = row.count;

    const priorityCounts = {};
    for (const p of PRIORITIES) priorityCounts[p] = 0;
    for (const row of byPriority) priorityCounts[row.priority] = row.count;

    const today = new Date().toISOString().slice(0, 10);
    const siteVisitsToday = db.queryOne(
      `SELECT COUNT(*) as count FROM leads WHERE org_id = ? AND site_visit_date = ?`,
      [orgId, today]
    )?.count || 0;

    return {
      total: totalLeads,
      byStatus: statusCounts,
      byPriority: priorityCounts,
      siteVisitsToday,
    };
  },

  getSiteVisitsToday(orgId) {
    const today = new Date().toISOString().slice(0, 10);
    return db.queryAll(
      `SELECT l.*, u.name as assigned_to_name 
       FROM leads l 
       LEFT JOIN users u ON l.assigned_to = u.id 
       WHERE l.org_id = ? AND l.site_visit_date = ? 
       ORDER BY l.priority DESC`,
      [orgId, today]
    );
  },

  getUpcomingSiteVisits(orgId, daysAhead = 7) {
    const today = new Date().toISOString().slice(0, 10);
    const maxDate = new Date(Date.now() + daysAhead * 86400000).toISOString().slice(0, 10);
    return db.queryAll(
      `SELECT l.*, u.name as assigned_to_name 
       FROM leads l 
       LEFT JOIN users u ON l.assigned_to = u.id 
       WHERE l.org_id = ? AND l.site_visit_date >= ? AND l.site_visit_date <= ? 
       ORDER BY l.site_visit_date ASC`,
      [orgId, today, maxDate]
    );
  },

  getUpcomingFollowups(orgId, daysAhead = 7) {
    const now = new Date().toISOString().slice(0, 10);
    const target = new Date(Date.now() + daysAhead * 86400000).toISOString().slice(0, 10);

    return db.queryAll(
      `SELECT l.*, u.name as assigned_to_name 
       FROM leads l 
       LEFT JOIN users u ON l.assigned_to = u.id 
       WHERE l.org_id = ? 
         AND l.next_followup IS NOT NULL 
         AND l.next_followup >= ? 
         AND l.next_followup <= ?
         AND l.status NOT IN ('WON', 'LOST')
       ORDER BY l.next_followup ASC`,
      [orgId, now, target]
    );
  },

  getOverdueFollowups(orgId) {
    const today = new Date().toISOString().slice(0, 10);
    return db.queryAll(
      `SELECT l.*, u.name as assigned_to_name 
       FROM leads l 
       LEFT JOIN users u ON l.assigned_to = u.id 
       WHERE l.org_id = ? 
         AND l.next_followup IS NOT NULL 
         AND l.next_followup < ? 
         AND l.status NOT IN ('WON', 'LOST')
       ORDER BY l.next_followup ASC`,
      [orgId, today]
    );
  },

  /**
   * Follow-ups Needing Attention
   * Sorted deterministically by:
   * 1. Overdue follow-up
   * 2. High/Urgent priority
   * 3. Upcoming site visit
   * 4. Newest lead
   */
  getFollowupsNeedingAttention(orgId, limit = 20) {
    const today = new Date().toISOString().slice(0, 10);

    const sql = `
      SELECT l.*, u.name as assigned_to_name,
        CASE 
          WHEN l.next_followup IS NOT NULL AND l.next_followup < ? THEN 1
          WHEN l.priority IN ('URGENT', 'HIGH') THEN 2
          WHEN l.site_visit_date IS NOT NULL AND l.site_visit_date >= ? THEN 3
          ELSE 4
        END as urgency_tier
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      WHERE l.org_id = ? AND l.status NOT IN ('WON', 'LOST')
      ORDER BY 
        urgency_tier ASC,
        CASE l.priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END ASC,
        CASE WHEN l.next_followup IS NULL THEN 1 ELSE 0 END, l.next_followup ASC,
        l.created_at DESC
      LIMIT ?
    `;

    return db.queryAll(sql, [today, today, orgId, limit]);
  }
};
