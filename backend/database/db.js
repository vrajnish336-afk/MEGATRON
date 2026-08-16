import { DatabaseSync } from 'node:sqlite';
import { config } from '../core/config.js';
import { logger } from '../core/logger.js';

let dbInstance = null;

export function getDb() {
  if (!dbInstance) {
    logger.info(`Initializing SQLite database connection at: ${config.db.file}`);
    dbInstance = new DatabaseSync(config.db.file);
    
    // Performance & integrity pragmas
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA synchronous = NORMAL;');
    dbInstance.exec('PRAGMA busy_timeout = 5000;');
  }
  return dbInstance;
}

export const db = {
  get raw() {
    return getDb();
  },

  queryOne(sql, params = []) {
    const stmt = getDb().prepare(sql);
    const result = stmt.get(...params);
    return result || null;
  },

  queryAll(sql, params = []) {
    const stmt = getDb().prepare(sql);
    return stmt.all(...params);
  },

  execute(sql, params = []) {
    const stmt = getDb().prepare(sql);
    return stmt.run(...params);
  },

  transaction(callback) {
    const database = getDb();
    database.exec('BEGIN TRANSACTION;');
    try {
      const result = callback(this);
      database.exec('COMMIT;');
      return result;
    } catch (err) {
      database.exec('ROLLBACK;');
      throw err;
    }
  },

  close() {
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
      logger.info('Database connection closed');
    }
  }
};
