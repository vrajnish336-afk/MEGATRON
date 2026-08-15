import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';

export const TASK_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export const taskRepo = {
  create({ orgId, title, description = null, priority = 'MEDIUM', status = 'PENDING', dueDate = null, assignedTo = null, leadId = null, reminders = [] }) {
    const id = `tsk_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const now = new Date().toISOString();
    const remindersJson = JSON.stringify(reminders);

    db.execute(
      `INSERT INTO tasks (id, org_id, title, description, priority, status, due_date, assigned_to, lead_id, reminders, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, orgId, title, description, priority, status, dueDate, assignedTo, leadId, remindersJson, now, now]
    );

    return this.findById(id, orgId);
  },

  findById(id, orgId) {
    let sql = `SELECT t.*, u.name as assigned_to_name, l.name as lead_name, l.company as lead_company 
               FROM tasks t 
               LEFT JOIN users u ON t.assigned_to = u.id 
               LEFT JOIN leads l ON t.lead_id = l.id 
               WHERE t.id = ?`;
    const params = [id];
    if (orgId) {
      sql += ` AND t.org_id = ?`;
      params.push(orgId);
    }
    const row = db.queryOne(sql, params);
    if (!row) return null;
    return {
      ...row,
      reminders: JSON.parse(row.reminders || '[]')
    };
  },

  listByOrg(orgId, { status = null, priority = null, assignedTo = null, leadId = null, search = null, limit = 100, offset = 0 } = {}) {
    let sql = `SELECT t.*, u.name as assigned_to_name, l.name as lead_name, l.company as lead_company 
               FROM tasks t 
               LEFT JOIN users u ON t.assigned_to = u.id 
               LEFT JOIN leads l ON t.lead_id = l.id 
               WHERE t.org_id = ?`;
    const params = [orgId];

    if (status) {
      sql += ` AND t.status = ?`;
      params.push(status);
    }
    if (priority) {
      sql += ` AND t.priority = ?`;
      params.push(priority);
    }
    if (assignedTo) {
      sql += ` AND t.assigned_to = ?`;
      params.push(assignedTo);
    }
    if (leadId) {
      sql += ` AND t.lead_id = ?`;
      params.push(leadId);
    }
    if (search) {
      sql += ` AND (t.title LIKE ? OR t.description LIKE ?)`;
      const pattern = `%${search}%`;
      params.push(pattern, pattern);
    }

    sql += ` ORDER BY CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END, t.due_date ASC, t.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const rows = db.queryAll(sql, params);
    return rows.map(r => ({
      ...r,
      reminders: JSON.parse(r.reminders || '[]')
    }));
  },

  update(id, orgId, fields) {
    const existing = this.findById(id, orgId);
    if (!existing) return null;

    const allowed = ['title', 'description', 'priority', 'status', 'due_date', 'assigned_to', 'lead_id', 'reminders'];
    const updates = [];
    const params = [];

    for (const key of allowed) {
      const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      const val = fields[camel] !== undefined ? fields[camel] : fields[key];
      if (val !== undefined) {
        if (key === 'reminders') {
          updates.push(`${key} = ?`);
          params.push(JSON.stringify(val));
        } else {
          updates.push(`${key} = ?`);
          params.push(val);
        }
      }
    }

    if (updates.length === 0) return existing;

    const now = new Date().toISOString();
    updates.push(`updated_at = ?`);
    params.push(now);

    params.push(id, orgId);
    db.execute(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ? AND org_id = ?`, params);

    return this.findById(id, orgId);
  },

  delete(id, orgId) {
    return db.execute(`DELETE FROM tasks WHERE id = ? AND org_id = ?`, [id, orgId]);
  },

  getStats(orgId) {
    const total = db.queryOne(`SELECT COUNT(*) as count FROM tasks WHERE org_id = ?`, [orgId])?.count || 0;
    const byStatus = db.queryAll(`SELECT status, COUNT(*) as count FROM tasks WHERE org_id = ? GROUP BY status`, [orgId]);
    const byPriority = db.queryAll(`SELECT priority, COUNT(*) as count FROM tasks WHERE org_id = ? GROUP BY priority`, [orgId]);

    const today = new Date().toISOString().slice(0, 10);
    const overdue = db.queryOne(
      `SELECT COUNT(*) as count FROM tasks 
       WHERE org_id = ? AND due_date < ? AND status NOT IN ('COMPLETED', 'CANCELLED')`,
      [orgId, today]
    )?.count || 0;

    const dueToday = db.queryOne(
      `SELECT COUNT(*) as count FROM tasks 
       WHERE org_id = ? AND due_date = ? AND status NOT IN ('COMPLETED', 'CANCELLED')`,
      [orgId, today]
    )?.count || 0;

    const statusCounts = {};
    for (const s of TASK_STATUSES) statusCounts[s] = 0;
    for (const row of byStatus) statusCounts[row.status] = row.count;

    const priorityCounts = {};
    for (const p of TASK_PRIORITIES) priorityCounts[p] = 0;
    for (const row of byPriority) priorityCounts[row.priority] = row.count;

    return {
      total,
      byStatus: statusCounts,
      byPriority: priorityCounts,
      overdue,
      dueToday,
    };
  },

  getTodayTasks(orgId) {
    const today = new Date().toISOString().slice(0, 10);
    const rows = db.queryAll(
      `SELECT t.*, u.name as assigned_to_name, l.name as lead_name 
       FROM tasks t 
       LEFT JOIN users u ON t.assigned_to = u.id 
       LEFT JOIN leads l ON t.lead_id = l.id 
       WHERE t.org_id = ? 
         AND t.due_date = ? 
         AND t.status NOT IN ('COMPLETED', 'CANCELLED')
       ORDER BY CASE t.priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END ASC`,
      [orgId, today]
    );
    return rows.map(r => ({ ...r, reminders: JSON.parse(r.reminders || '[]') }));
  },

  getOverdueTasks(orgId) {
    const today = new Date().toISOString().slice(0, 10);
    const rows = db.queryAll(
      `SELECT t.*, u.name as assigned_to_name, l.name as lead_name 
       FROM tasks t 
       LEFT JOIN users u ON t.assigned_to = u.id 
       LEFT JOIN leads l ON t.lead_id = l.id 
       WHERE t.org_id = ? 
         AND t.due_date < ? 
         AND t.status NOT IN ('COMPLETED', 'CANCELLED')
       ORDER BY t.due_date ASC`,
      [orgId, today]
    );
    return rows.map(r => ({ ...r, reminders: JSON.parse(r.reminders || '[]') }));
  }
};
