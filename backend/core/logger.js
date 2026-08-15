import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { sanitizeObject } from '../security/sanitizer.js';

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const currentLevelNum = LOG_LEVELS[config.logging.level.toLowerCase()] ?? LOG_LEVELS.info;
const logFilePath = path.join(config.logsDir, 'megadrone.log');

function formatTimestamp() {
  return new Date().toISOString();
}

function writeToFile(line) {
  try {
    fs.appendFileSync(logFilePath, line + '\n', 'utf8');
  } catch (err) {
    console.error('Failed writing to log file:', err.message);
  }
}

function log(level, message, meta = {}) {
  if (LOG_LEVELS[level] < currentLevelNum) return;

  const sanitizedMeta = config.logging.sanitizeSecrets ? sanitizeObject(meta) : meta;
  const logEntry = {
    timestamp: formatTimestamp(),
    level: level.toUpperCase(),
    message,
    ...(Object.keys(sanitizedMeta).length > 0 ? { meta: sanitizedMeta } : {})
  };

  const jsonString = JSON.stringify(logEntry);

  if (level === 'error') {
    console.error(`[${logEntry.timestamp}] [${logEntry.level}] ${message}`, Object.keys(sanitizedMeta).length ? sanitizedMeta : '');
  } else if (level === 'warn') {
    console.warn(`[${logEntry.timestamp}] [${logEntry.level}] ${message}`, Object.keys(sanitizedMeta).length ? sanitizedMeta : '');
  } else {
    console.log(`[${logEntry.timestamp}] [${logEntry.level}] ${message}`, Object.keys(sanitizedMeta).length ? sanitizedMeta : '');
  }

  writeToFile(jsonString);
}

export const logger = {
  debug: (msg, meta) => log('debug', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
};
