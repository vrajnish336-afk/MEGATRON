/**
 * Production-ready in-memory Sliding Window Rate Limiter Middleware
 * Scoped to specific security-sensitive endpoints (e.g. login).
 */

export function createRateLimiter({
  windowMs = 60000,
  max = 10,
  message = 'Too many login attempts. Please try again in 1 minute.',
  code = 'RATE_LIMIT_EXCEEDED',
} = {}) {
  const hits = new Map();

  // Periodic memory cleanup of expired records
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(key);
      }
    }
  }, Math.max(windowMs, 10000));
  
  if (cleanupTimer.unref) cleanupTimer.unref();

  const middleware = function rateLimitMiddleware(req, res, next) {
    const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
    const now = Date.now();
    const record = hits.get(ip);

    if (!record || now > record.resetTime) {
      hits.set(ip, {
        count: 1,
        resetTime: now + windowMs,
      });
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - 1);
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));
      return next();
    }

    if (record.count >= max) {
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));
      res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
      return res.status(429).json({
        success: false,
        error: {
          code,
          message,
        },
      });
    }

    record.count++;
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', max - record.count);
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));
    next();
  };

  // Expose hit map and reset helper for testing
  middleware._hits = hits;
  middleware.reset = () => hits.clear();

  return middleware;
}

export const loginRateLimiter = createRateLimiter({
  windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '10', 10),
  message: 'Too many login attempts. Please try again in 1 minute.',
  code: 'RATE_LIMIT_EXCEEDED',
});
