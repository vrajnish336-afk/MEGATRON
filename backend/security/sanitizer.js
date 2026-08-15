/**
 * Secret and PII Sanitizer
 * Redacts passwords, API keys, JWT tokens, auth headers, and sensitive fields.
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'passwd',
  'secret',
  'api_key',
  'apikey',
  'token',
  'jwt',
  'authorization',
  'auth',
  'credit_card',
  'card_number',
  'cvv',
  'private_key'
]);

const SENSITIVE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-_.]+/gi,
  /sk-[A-Za-z0-9]{20,}/gi,
  /AIza[0-9A-Za-z-_]{35}/gi,
  /"password"\s*:\s*"[^"]+"/gi,
];

export function sanitizeObject(obj, depth = 0) {
  if (depth > 5) return '[MAX_DEPTH_REACHED]';
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('password') || lowerKey.includes('secret') || lowerKey.includes('apikey')) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, depth + 1);
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function sanitizeString(str) {
  if (!str || typeof str !== 'string') return str;
  let result = str;
  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, '[REDACTED_SECRET]');
  }
  return result;
}
