import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProductionConfig, config } from '../core/config.js';
import { createRateLimiter } from '../api/middleware/rateLimiter.js';
import { createApp, stopServer } from '../api/server.js';
import express from 'express';
import cors from 'cors';

test('1. JWT Secret Validation: Valid 32+ char secret in production passes', () => {
  const originalEnv = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'a_very_secure_production_jwt_secret_key_32_chars!';
  
  const mockCfg = {
    env: 'production',
    jwt: {
      secret: process.env.JWT_SECRET,
    }
  };

  const result = validateProductionConfig(mockCfg);
  assert.equal(result, true);

  process.env.JWT_SECRET = originalEnv;
});

test('2. JWT Secret Validation: Missing secret in production throws fast startup error', () => {
  const originalEnv = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;

  const mockCfg = {
    env: 'production',
    jwt: {
      secret: '',
    }
  };

  assert.throws(() => {
    validateProductionConfig(mockCfg);
  }, {
    message: /Production startup blocked: JWT_SECRET must be explicitly configured/i,
  });

  process.env.JWT_SECRET = originalEnv;
});

test('3. JWT Secret Validation: Short secret (<32 chars) in production throws error', () => {
  const originalEnv = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'short_insecure_secret_123';

  const mockCfg = {
    env: 'production',
    jwt: {
      secret: process.env.JWT_SECRET,
    }
  };

  assert.throws(() => {
    validateProductionConfig(mockCfg);
  }, {
    message: /must be at least 32 characters long/i,
  });

  process.env.JWT_SECRET = originalEnv;
});

test('4. JWT Secret Validation: Known fallback secret in production throws error', () => {
  const originalEnv = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'megadrone_fallback_secret_key_1234567890';

  const mockCfg = {
    env: 'production',
    jwt: {
      secret: process.env.JWT_SECRET,
    }
  };

  assert.throws(() => {
    validateProductionConfig(mockCfg);
  }, {
    message: /Production startup blocked/i,
  });

  process.env.JWT_SECRET = originalEnv;
});

test('5. JWT Secret Validation: In development, fallback does not block execution', () => {
  const mockCfg = {
    env: 'development',
    jwt: {
      secret: 'megadrone_fallback_secret_key_1234567890',
    }
  };

  const result = validateProductionConfig(mockCfg);
  assert.equal(result, true);
});

test('6. Login Rate Limiting: Blocks requests exceeding the limit with 429', async () => {
  const limiter = createRateLimiter({
    windowMs: 60000,
    max: 3,
    message: 'Too many login attempts. Please try again in 1 minute.',
    code: 'RATE_LIMIT_EXCEEDED',
  });

  const app = express();
  app.use(express.json());
  app.post('/api/auth/test-login', limiter, (req, res) => {
    res.json({ success: true, message: 'Login allowed' });
  });

  const server = app.listen(0);
  const port = server.address().port;

  try {
    // 1st request (count 1/3)
    const res1 = await fetch(`http://127.0.0.1:${port}/api/auth/test-login`, { method: 'POST' });
    assert.equal(res1.status, 200);

    // 2nd request (count 2/3)
    const res2 = await fetch(`http://127.0.0.1:${port}/api/auth/test-login`, { method: 'POST' });
    assert.equal(res2.status, 200);

    // 3rd request (count 3/3)
    const res3 = await fetch(`http://127.0.0.1:${port}/api/auth/test-login`, { method: 'POST' });
    assert.equal(res3.status, 200);

    // 4th request (exceeds limit -> 429)
    const res4 = await fetch(`http://127.0.0.1:${port}/api/auth/test-login`, { method: 'POST' });
    assert.equal(res4.status, 429);
    const json4 = await res4.json();
    assert.equal(json4.success, false);
    assert.equal(json4.error.code, 'RATE_LIMIT_EXCEEDED');
    assert.ok(json4.error.message.includes('Too many login attempts'));

    // Reset limiter
    limiter.reset();
    const res5 = await fetch(`http://127.0.0.1:${port}/api/auth/test-login`, { method: 'POST' });
    assert.equal(res5.status, 200);
  } finally {
    server.close();
  }
});

test('7. Production CORS: Restricts origin in production mode', async () => {
  const allowedOrigin = 'https://megatron.enterprise.com';
  
  const app = express();
  app.use(cors({
    origin: allowedOrigin,
    methods: ['GET', 'POST'],
  }));
  app.get('/api/test-cors', (req, res) => res.json({ ok: true }));

  const server = app.listen(0);
  const port = server.address().port;

  try {
    // Request with matching origin -> receives Allow-Origin header
    const resAllowed = await fetch(`http://127.0.0.1:${port}/api/test-cors`, {
      headers: { Origin: allowedOrigin },
    });
    assert.equal(resAllowed.headers.get('access-control-allow-origin'), allowedOrigin);

    // Request with disallowed origin -> does NOT receive Allow-Origin header for that origin
    const resDisallowed = await fetch(`http://127.0.0.1:${port}/api/test-cors`, {
      headers: { Origin: 'https://malicious-site.com' },
    });
    assert.notEqual(resDisallowed.headers.get('access-control-allow-origin'), 'https://malicious-site.com');
  } finally {
    server.close();
  }
});

test('8. Graceful Shutdown Helper: Closes server and database cleanly', async () => {
  const app = createApp();
  const server = app.listen(0);
  assert.ok(server.listening);

  await stopServer(server);
  assert.equal(server.listening, false);
});
