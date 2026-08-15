import { db } from './db.js';
import { DDL_STATEMENTS } from './schema.js';
import { logger } from '../core/logger.js';

export function runMigrations() {
  logger.info('Running database schema migrations...');
  try {
    const rawDb = db.raw;
    for (const sql of DDL_STATEMENTS) {
      rawDb.exec(sql);
    }
    logger.info('Database schema migrations completed successfully.');
    return true;
  } catch (err) {
    logger.error('Failed to run database migrations:', { error: err.message, stack: err.stack });
    throw err;
  }
}
