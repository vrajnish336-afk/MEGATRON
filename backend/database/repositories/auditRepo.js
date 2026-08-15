import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { sanitizeObject } from '../../security/sanitizer.js';

export const auditRepo = {
  create({ orgId, userId = null, action, resourceType, resourceId = null, aiProvider = null, details = {}, status = 'SUCCESS', ipAddress = null }) {
    const id = `aud_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const timestamp = new Date().toISOString();
    const sanitizedDetails = sanitizeObject(details);
    const detailsJson = JSON.stringify(sanitizedDetails);

    db.execute(
      `INSERT INTO audit_logs (id, org_id, user_id, action, resource_type, resource_id, ai_provider, details_json, status, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, orgId, userId, action, resourceType, resourceId, aiProvider, detailsJson, status, ipAddress, timestamp]
    );

    return this.findById(id);
  },

  findById(id) {
    const log = db.queryOne(`SELECT * FROM audit_logs WHERE id = ?`, [id]);
    if (!log) return null;
    return {
      ...log,
      details: JSON.parse(log.details_json || '{}')
    };
  },

  listByOrg(orgId, { limit = 50, offset = 0, action = null, resourceType = null } = {}) {
    let sql = `SELECT a.*, u.name as user_name, u.email as user_email 
               FROM audit_logs a 
               LEFT JOIN users u ON a.user_id = u.id 
               WHERE a.org_id = ?`;
    const params = [orgId];

    if (action) {
      sql += ` AND a.action = ?`;
      params.push(action);
    }
    if (resourceType) {
      sql += ` AND a.resource_type = ?`;
      params.push(resourceType);
    }

    sql += ` ORDER BY a.timestamp DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const logs = db.queryAll(sql, params);
    return logs.map(l => ({
      ...l,
      details: JSON.parse(l.details_json || '{}')
    }));
  }
};
