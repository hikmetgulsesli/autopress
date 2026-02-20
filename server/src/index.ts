import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authLimiter, apiLimiter } from './middleware/rateLimiter';
import { securityHeaders } from './middleware/securityHeaders';
import authRoutes from './routes/auth';
import sitesRoutes from './routes/sites';
import articlesRoutes from './routes/articles';
import trendsRoutes from './routes/trends';
import publishRoutes from './routes/publish';
import seoRoutes from './routes/seo';
import settingsRoutes from './routes/settings';
import searchConsoleRoutes from './routes/searchconsole';
import schedulerRoutes from './routes/scheduler';
import imagesRoutes from './routes/images';
import rssRoutes from './routes/rss';
import bulkSeoRoutes from './routes/bulkseo';
import securityRoutes from './routes/security';
import { startScheduler, getSchedulerStatus } from './services/scheduler.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4519;

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3519', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined', { stream: { write: (msg: string) => logger.info(msg.trim()) } }));
app.use(securityHeaders);

// Apply rate limiters
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

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
app.use('/api/images', imagesRoutes);
app.use('/api/rss', rssRoutes);
app.use('/api/bulk-seo', bulkSeoRoutes);
app.use('/api/security', securityRoutes);

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

export default app;
