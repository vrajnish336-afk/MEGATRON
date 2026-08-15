import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';

export const orgRepo = {
  create({ name, slug, plan = 'business', settings = {} }) {
    const id = `org_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const now = new Date().toISOString();
    const settingsStr = JSON.stringify(settings);
    
    db.execute(
      `INSERT INTO organizations (id, name, slug, plan, settings, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, name, slug, plan, settingsStr, now, now]
    );

    return this.findById(id);
  },

  findById(id) {
    const org = db.queryOne(`SELECT * FROM organizations WHERE id = ?`, [id]);
    if (!org) return null;
    return {
      ...org,
      settings: JSON.parse(org.settings || '{}')
    };
  },

  findBySlug(slug) {
    const org = db.queryOne(`SELECT * FROM organizations WHERE slug = ?`, [slug]);
    if (!org) return null;
    return {
      ...org,
      settings: JSON.parse(org.settings || '{}')
    };
  },

  update(id, { name, plan, settings }) {
    const org = this.findById(id);
    if (!org) return null;

    const newName = name !== undefined ? name : org.name;
    const newPlan = plan !== undefined ? plan : org.plan;
    const newSettings = settings !== undefined ? JSON.stringify(settings) : JSON.stringify(org.settings);
    const now = new Date().toISOString();

    db.execute(
      `UPDATE organizations SET name = ?, plan = ?, settings = ?, updated_at = ? WHERE id = ?`,
      [newName, newPlan, newSettings, now, id]
    );

    return this.findById(id);
  },

  listAll() {
    const orgs = db.queryAll(`SELECT * FROM organizations ORDER BY created_at DESC`);
    return orgs.map(o => ({ ...o, settings: JSON.parse(o.settings || '{}') }));
  }
};
