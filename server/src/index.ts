import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import sitesRoutes from './routes/sites';
import articlesRoutes from './routes/articles';
import trendsRoutes from './routes/trends';
import publishRoutes from './routes/publish';
import seoRoutes from './routes/seo';
import settingsRoutes from './routes/settings';
import searchConsoleRoutes from './routes/searchconsole';
import schedulerRoutes from './routes/scheduler';
import { startScheduler, getSchedulerStatus } from './services/scheduler.service';
import { query } from './db/connection';

dotenv.config();

export const app = express();
const PORT = process.env.PORT || 4519;

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3519', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined', { stream: { write: (msg: string) => logger.info(msg.trim()) } }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sites', sitesRoutes);
app.use('/api/articles', articlesRoutes);
app.use('/api/trends', trendsRoutes);
app.use('/api/publish', publishRoutes);
app.use('/api/seo', seoRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/search-console', searchConsoleRoutes);
app.use('/api/scheduler', schedulerRoutes);

// Health check
app.get('/api/health', async (_req, res) => {
  let dbStatus: 'healthy' | 'degraded' = 'healthy';
  
  try {
    // Check database connectivity with a 2-second timeout
    await Promise.race([
      query('SELECT 1'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('DB_TIMEOUT')), 2000)
      ),
    ]);
  } catch (err) {
    dbStatus = 'degraded';
    logger.warn('Health check: Database connectivity issue', { error: (err as Error).message });
  }
  
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(), 
    version: '1.0.0',
    db_status: dbStatus,
    scheduler: getSchedulerStatus(),
  });
});

// API 404 handler - must be after all routes
app.use('/api/*', (_req, res) => {
  res.status(404).json({
    error: 'Endpoint bulunamadi',
    message: 'Istenen API endpointi mevcut degil',
    path: _req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

app.use(errorHandler);

// Only start the server if this file is run directly (not imported for testing)
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`AutoPress API running on port ${PORT}`);
    
    // Start the scheduler cron job
    startScheduler();
    logger.info('Scheduler started');
  });
}

export default app;
