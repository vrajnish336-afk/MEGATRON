import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';

export const reportRepo = {
  create({ orgId, reportType, title, metrics, aiAnalysis = null, generatedBy = null }) {
    const id = `rep_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const now = new Date().toISOString();
    const metricsStr = JSON.stringify(metrics);

    db.execute(
      `INSERT INTO reports (id, org_id, report_type, title, metrics_json, ai_analysis, generated_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, orgId, reportType, title, metricsStr, aiAnalysis, generatedBy, now]
    );

    return this.findById(id, orgId);
  },

  findById(id, orgId) {
    let sql = `SELECT * FROM reports WHERE id = ?`;
    const params = [id];
    if (orgId) {
      sql += ` AND org_id = ?`;
      params.push(orgId);
    }
    const row = db.queryOne(sql, params);
    if (!row) return null;
    return {
      ...row,
      metrics: JSON.parse(row.metrics_json || '{}')
    };
  },

  listByOrg(orgId, { limit = 50 } = {}) {
    const rows = db.queryAll(
      `SELECT * FROM reports WHERE org_id = ? ORDER BY created_at DESC LIMIT ?`,
      [orgId, limit]
    );
    return rows.map(r => ({
      ...r,
      metrics: JSON.parse(r.metrics_json || '{}')
    }));
  },

  delete(id, orgId) {
    return db.execute(`DELETE FROM reports WHERE id = ? AND org_id = ?`, [id, orgId]);
  }
};
