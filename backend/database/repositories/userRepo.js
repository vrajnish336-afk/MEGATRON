import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';

export const userRepo = {
  create({ orgId, name, email, passwordHash, role = 'EMPLOYEE' }) {
    const id = `usr_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const now = new Date().toISOString();

    db.execute(
      `INSERT INTO users (id, org_id, name, email, password_hash, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [id, orgId, name, email.toLowerCase().trim(), passwordHash, role, now, now]
    );

    return this.findById(id);
  },

  findById(id) {
    const user = db.queryOne(`SELECT * FROM users WHERE id = ?`, [id]);
    return user || null;
  },

  findByEmail(email) {
    if (!email) return null;
    const user = db.queryOne(`SELECT * FROM users WHERE email = ?`, [email.toLowerCase().trim()]);
    return user || null;
  },

  findByOrg(orgId) {
    return db.queryAll(
      `SELECT id, org_id, name, email, role, is_active, created_at, updated_at 
       FROM users WHERE org_id = ? ORDER BY created_at ASC`,
      [orgId]
    );
  },

  update(id, { name, role, isActive, passwordHash }) {
    const user = this.findById(id);
    if (!user) return null;

    const newName = name !== undefined ? name : user.name;
    const newRole = role !== undefined ? role : user.role;
    const newActive = isActive !== undefined ? (isActive ? 1 : 0) : user.is_active;
    const newHash = passwordHash !== undefined ? passwordHash : user.password_hash;
    const now = new Date().toISOString();

    db.execute(
      `UPDATE users SET name = ?, role = ?, is_active = ?, password_hash = ?, updated_at = ? WHERE id = ?`,
      [newName, newRole, newActive, newHash, now, id]
    );

    return this.findById(id);
  },

  delete(id) {
    return db.execute(`DELETE FROM users WHERE id = ?`, [id]);
  }
};
