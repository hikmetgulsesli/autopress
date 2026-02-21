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
import { startScheduler, stopScheduler, getSchedulerStatus } from './services/scheduler.service';
import { pool } from './db/connection';

dotenv.config();

const app = express();
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
app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(), 
    version: '1.0.0',
    scheduler: getSchedulerStatus(),
  });
});

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`AutoPress API running on port ${PORT}`);
  
  // Start the scheduler cron job
  startScheduler();
  logger.info('Scheduler started');
});

// Graceful shutdown handler
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  // Stop the scheduler first to prevent new jobs
  stopScheduler();
  logger.info('Scheduler stopped');
  
  // Drain the database pool
  try {
    await pool.end();
    logger.info('Database pool drained');
  } catch (err) {
    logger.error('Error draining database pool:', err);
  }
  
  logger.info('Graceful shutdown complete');
  process.exit(0);
};

// Register signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
