import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { sanitizeObject } from '../../security/sanitizer.js';

export const approvalRepo = {
  create({ orgId, workflowRunId = null, actionType, riskLevel = 'HIGH', payload = {}, reason, requestedBy = 'AI_ORCHESTRATOR' }) {
    const id = `appr_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const now = new Date().toISOString();
    const payloadStr = JSON.stringify(sanitizeObject(payload));

    db.execute(
      `INSERT INTO approvals (id, org_id, workflow_run_id, action_type, risk_level, payload_json, reason, status, requested_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
      [id, orgId, workflowRunId, actionType, riskLevel, payloadStr, reason, requestedBy, now]
    );

    return this.findById(id, orgId);
  },

  findById(id, orgId) {
    let sql = `SELECT a.*, u.name as approved_by_name 
               FROM approvals a 
               LEFT JOIN users u ON a.approved_by = u.id 
               WHERE a.id = ?`;
    const params = [id];
    if (orgId) {
      sql += ` AND a.org_id = ?`;
      params.push(orgId);
    }
    const row = db.queryOne(sql, params);
    if (!row) return null;
    return {
      ...row,
      payload: JSON.parse(row.payload_json || '{}')
    };
  },

  listByOrg(orgId, { status = null, limit = 50, offset = 0 } = {}) {
    let sql = `SELECT a.*, u.name as approved_by_name 
               FROM approvals a 
               LEFT JOIN users u ON a.approved_by = u.id 
               WHERE a.org_id = ?`;
    const params = [orgId];

    if (status) {
      sql += ` AND a.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY CASE a.status WHEN 'PENDING' THEN 1 ELSE 2 END, a.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const rows = db.queryAll(sql, params);
    return rows.map(r => ({
      ...r,
      payload: JSON.parse(r.payload_json || '{}')
    }));
  },

  updatePayload(id, orgId, payload) {
    const existing = this.findById(id, orgId);
    if (!existing) return null;

    const payloadStr = JSON.stringify(sanitizeObject(payload));
    db.execute(
      `UPDATE approvals SET payload_json = ? WHERE id = ? AND org_id = ?`,
      [payloadStr, id, orgId]
    );

    return this.findById(id, orgId);
  },

  resolve(id, orgId, { status, approvedBy, rejectionReason = null }) {
    const existing = this.findById(id, orgId);
    if (!existing) return null;

    const now = new Date().toISOString();
    db.execute(
      `UPDATE approvals SET status = ?, approved_by = ?, rejection_reason = ?, resolved_at = ? WHERE id = ? AND org_id = ?`,
      [status, approvedBy, rejectionReason, now, id, orgId]
    );

    return this.findById(id, orgId);
  }
};
