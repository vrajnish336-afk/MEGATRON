import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../core/config.js';
import { logger } from '../core/logger.js';
import { runMigrations } from '../database/migrations.js';
import { initializeTools } from '../tools/systemTools.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import orgRoutes from './routes/organizations.js';
import leadRoutes from './routes/leads.js';
import taskRoutes from './routes/tasks.js';
import workflowRoutes from './routes/workflows.js';
import approvalRoutes from './routes/approvals.js';
import reportRoutes from './routes/reports.js';
import activityRoutes from './routes/activities.js';
import aiRoutes from './routes/ai.js';
import dashboardRoutes from './routes/dashboard.js';
import settingsRoutes from './routes/settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, '../../frontend/public');

export function createApp() {
  const app = express();

  // Basic security & parsing
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(express.json({ limit: '5mb' }));

  // Request logger middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (req.path.startsWith('/api') && req.path !== '/api/health') {
        logger.info(`${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
      }
    });
    next();
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      platform: 'MEGADRONE Business OS',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // API Route mounting
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/organizations', orgRoutes);
  app.use('/api/leads', leadRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/workflows', workflowRoutes);
  app.use('/api/approvals', approvalRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/activities', activityRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/settings', settingsRoutes);

  // Serve Frontend static assets if available
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
      if (err) next();
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}

export async function startServer() {
  try {
    logger.info('====================================================');
    logger.info('  MEGADRONE Business OS - Bootstrapping System');
    logger.info('====================================================');

    // 1. Run migrations
    runMigrations();

    // 2. Initialize tools
    initializeTools();

    // 3. Create app and start listening
    const app = createApp();
    const server = app.listen(config.port, config.host, () => {
      logger.info(`MEGADRONE API Server online at http://${config.host}:${config.port}`);
      logger.info(`Environment: ${config.env}`);
    });

    return { app, server };
  } catch (err) {
    logger.error('Fatal bootstrapping failure:', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

// Start if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}
