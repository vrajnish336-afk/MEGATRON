import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';

export const workflowRepo = {
  create({ orgId, name, description = null, triggerType, conditions = [], actions = [], createdBy = null, isActive = 1 }) {
    const id = `wf_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const now = new Date().toISOString();
    const condStr = JSON.stringify(conditions);
    const actStr = JSON.stringify(actions);

    db.execute(
      `INSERT INTO workflows (id, org_id, name, description, trigger_type, conditions_json, actions_json, is_active, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, orgId, name, description, triggerType, condStr, actStr, isActive ? 1 : 0, createdBy, now, now]
    );

    return this.findById(id, orgId);
  },

  findById(id, orgId) {
    let sql = `SELECT * FROM workflows WHERE id = ?`;
    const params = [id];
    if (orgId) {
      sql += ` AND org_id = ?`;
      params.push(orgId);
    }
    const row = db.queryOne(sql, params);
    if (!row) return null;
    return {
      ...row,
      conditions: JSON.parse(row.conditions_json || '[]'),
      actions: JSON.parse(row.actions_json || '[]'),
    };
  },

  listByOrg(orgId, { triggerType = null, isActive = null } = {}) {
    let sql = `SELECT * FROM workflows WHERE org_id = ?`;
    const params = [orgId];

    if (triggerType) {
      sql += ` AND trigger_type = ?`;
      params.push(triggerType);
    }
    if (isActive !== null) {
      sql += ` AND is_active = ?`;
      params.push(isActive ? 1 : 0);
    }

    sql += ` ORDER BY created_at DESC`;
    const rows = db.queryAll(sql, params);
    return rows.map(r => ({
      ...r,
      conditions: JSON.parse(r.conditions_json || '[]'),
      actions: JSON.parse(r.actions_json || '[]'),
    }));
  },

  update(id, orgId, fields) {
    const existing = this.findById(id, orgId);
    if (!existing) return null;

    const allowed = ['name', 'description', 'trigger_type', 'conditions', 'actions', 'is_active'];
    const updates = [];
    const params = [];

    if (fields.name !== undefined) { updates.push('name = ?'); params.push(fields.name); }
    if (fields.description !== undefined) { updates.push('description = ?'); params.push(fields.description); }
    if (fields.triggerType !== undefined) { updates.push('trigger_type = ?'); params.push(fields.triggerType); }
    if (fields.conditions !== undefined) { updates.push('conditions_json = ?'); params.push(JSON.stringify(fields.conditions)); }
    if (fields.actions !== undefined) { updates.push('actions_json = ?'); params.push(JSON.stringify(fields.actions)); }
    if (fields.isActive !== undefined) { updates.push('is_active = ?'); params.push(fields.isActive ? 1 : 0); }

    if (updates.length === 0) return existing;

    const now = new Date().toISOString();
    updates.push('updated_at = ?');
    params.push(now);

    params.push(id, orgId);
    db.execute(`UPDATE workflows SET ${updates.join(', ')} WHERE id = ? AND org_id = ?`, params);

    return this.findById(id, orgId);
  },

  delete(id, orgId) {
    return db.execute(`DELETE FROM workflows WHERE id = ? AND org_id = ?`, [id, orgId]);
  },

  // Workflow Runs
  createRun({ workflowId, orgId, triggerEvent }) {
    const id = `wfr_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const now = new Date().toISOString();

    db.execute(
      `INSERT INTO workflow_runs (id, workflow_id, org_id, trigger_event, status, execution_steps_json, started_at)
       VALUES (?, ?, ?, ?, 'RUNNING', '[]', ?)`,
      [id, workflowId, orgId, triggerEvent, now]
    );

    return this.findRunById(id, orgId);
  },

  findRunById(id, orgId) {
    let sql = `SELECT * FROM workflow_runs WHERE id = ?`;
    const params = [id];
    if (orgId) {
      sql += ` AND org_id = ?`;
      params.push(orgId);
    }
    const row = db.queryOne(sql, params);
    if (!row) return null;
    return {
      ...row,
      executionSteps: JSON.parse(row.execution_steps_json || '[]')
    };
  },

  listRunsByOrg(orgId, { workflowId = null, limit = 50 } = {}) {
    let sql = `SELECT r.*, w.name as workflow_name 
               FROM workflow_runs r 
               LEFT JOIN workflows w ON r.workflow_id = w.id 
               WHERE r.org_id = ?`;
    const params = [orgId];
    if (workflowId) {
      sql += ` AND r.workflow_id = ?`;
      params.push(workflowId);
    }
    sql += ` ORDER BY r.started_at DESC LIMIT ?`;
    params.push(limit);

    const rows = db.queryAll(sql, params);
    return rows.map(r => ({
      ...r,
      executionSteps: JSON.parse(r.execution_steps_json || '[]')
    }));
  },

  updateRun(id, orgId, { status, executionSteps, errorMessage = null }) {
    const now = new Date().toISOString();
    const stepsStr = executionSteps ? JSON.stringify(executionSteps) : undefined;

    let sql = `UPDATE workflow_runs SET status = ?`;
    const params = [status];

    if (stepsStr !== undefined) {
      sql += `, execution_steps_json = ?`;
      params.push(stepsStr);
    }
    if (errorMessage !== null) {
      sql += `, error_message = ?`;
      params.push(errorMessage);
    }
    if (status === 'COMPLETED' || status === 'FAILED') {
      sql += `, completed_at = ?`;
      params.push(now);
    }

    sql += ` WHERE id = ? AND org_id = ?`;
    params.push(id, orgId);

    db.execute(sql, params);
    return this.findRunById(id, orgId);
  }
};
