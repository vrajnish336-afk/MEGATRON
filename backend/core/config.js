import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

// Load .env
dotenv.config({ path: path.join(rootDir, '.env') });

// Ensure data & logs directories exist
const dataDir = path.join(rootDir, 'data');
const logsDir = path.join(rootDir, 'logs');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  host: process.env.HOST || '0.0.0.0',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  rootDir,
  dataDir,
  logsDir,

  jwt: {
    secret: process.env.JWT_SECRET || 'megadrone_fallback_secret_key_1234567890',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
  },

  db: {
    type: process.env.DATABASE_TYPE || 'sqlite',
    file: process.env.DATABASE_FILE 
      ? path.resolve(rootDir, process.env.DATABASE_FILE)
      : path.join(dataDir, 'megadrone.sqlite'),
  },

  cloudAi: {
    provider: process.env.CLOUD_AI_PROVIDER || 'openai_compatible',
    apiKey: process.env.CLOUD_AI_API_KEY || '',
    baseUrl: process.env.CLOUD_AI_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.CLOUD_AI_MODEL || 'gpt-4o-mini',
    timeoutMs: parseInt(process.env.CLOUD_AI_TIMEOUT_MS || '30000', 10),
    maxRetries: parseInt(process.env.CLOUD_AI_MAX_RETRIES || '2', 10),
  },

  localAi: {
    provider: 'ollama',
    baseUrl: process.env.LOCAL_OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
    model: process.env.LOCAL_OLLAMA_MODEL || 'llama3.2:latest',
    timeoutMs: parseInt(process.env.LOCAL_OLLAMA_TIMEOUT_MS || '60000', 10),
  },

  aiRouting: {
    strategy: process.env.AI_ROUTING_STRATEGY || 'dynamic', // dynamic, prefer_local, prefer_cloud, force_local, force_cloud
  },

  dataPolicy: {
    allowCloudForPublic: process.env.ALLOW_CLOUD_FOR_PUBLIC !== 'false',
    allowCloudForInternal: process.env.ALLOW_CLOUD_FOR_INTERNAL !== 'false',
    allowCloudForConfidential: process.env.ALLOW_CLOUD_FOR_CONFIDENTIAL === 'true',
    allowCloudForSensitive: process.env.ALLOW_CLOUD_FOR_SENSITIVE === 'true',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableAuditLog: process.env.ENABLE_AUDIT_LOG !== 'false',
    sanitizeSecrets: process.env.SANITIZE_SECRETS_IN_LOGS !== 'false',
  }
};
