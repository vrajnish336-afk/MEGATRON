import { db } from './db.js';
import { DDL_STATEMENTS } from './schema.js';
import { logger } from '../core/logger.js';

export function runMigrations() {
  logger.info('Running database schema migrations...');
  try {
    const rawDb = db.raw;

    // Run base DDL statements
    for (const sql of DDL_STATEMENTS) {
      rawDb.exec(sql);
    }

    // Check & safely apply incremental column additions for existing leads table
    const tableInfo = rawDb.prepare(`PRAGMA table_info(leads);`).all();
    const existingCols = new Set(tableInfo.map(col => col.name));

    const realEstateColumns = [
      { name: 'property_type', type: 'TEXT' },
      { name: 'budget_min', type: 'REAL' },
      { name: 'budget_max', type: 'REAL' },
      { name: 'preferred_location', type: 'TEXT' },
      { name: 'bedrooms', type: 'INTEGER' },
      { name: 'purpose', type: 'TEXT' },
      { name: 'buy_or_rent', type: 'TEXT' },
      { name: 'site_visit_date', type: 'TEXT' },
      { name: 'lead_source', type: 'TEXT' },
      { name: 'preferred_contact_time', type: 'TEXT' },
    ];

    for (const col of realEstateColumns) {
      if (!existingCols.has(col.name)) {
        logger.info(`Applying migration: adding column '${col.name}' to leads table...`);
        rawDb.exec(`ALTER TABLE leads ADD COLUMN ${col.name} ${col.type};`);
      }
    }

    // Add index on site_visit_date if not present
    rawDb.exec(`CREATE INDEX IF NOT EXISTS idx_leads_site_visit ON leads(org_id, site_visit_date);`);

    // Safely migrate Principal Broker demo persona in SQLite database
    rawDb.exec(`
      UPDATE users 
      SET name = 'Rajnish Verma (Principal Broker)', email = 'rajnish.verma@apexrealty.demo'
      WHERE email = 'rohit.sharma@apexrealty.demo' OR name = 'Rohit Sharma (Principal Broker)';

      UPDATE approvals
      SET requested_by = 'Rajnish Verma (Principal Broker)'
      WHERE requested_by = 'Rohit Sharma (Principal Broker)';

      UPDATE approvals
      SET payload_json = REPLACE(REPLACE(payload_json, 'Rohit Sharma', 'Rajnish Verma'), 'rohit.sharma', 'rajnish.verma')
      WHERE payload_json LIKE '%Rohit%' OR payload_json LIKE '%rohit%';

      UPDATE audit_logs
      SET details_json = REPLACE(REPLACE(details_json, 'Rohit Sharma', 'Rajnish Verma'), 'rohit.sharma', 'rajnish.verma')
      WHERE details_json LIKE '%Rohit%' OR details_json LIKE '%rohit%';
    `);

    logger.info('Database schema migrations completed successfully.');
    return true;
  } catch (err) {
    logger.error('Failed to run database migrations:', { error: err.message, stack: err.stack });
    throw err;
  }
}
