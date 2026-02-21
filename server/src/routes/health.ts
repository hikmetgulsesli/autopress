import { Router, Request, Response } from 'express';
import { query } from '../db/connection';

const router = Router();

interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
  db_status: 'healthy' | 'degraded' | 'down';
}

/**
 * GET /api/health
 * Health check endpoint with database connectivity verification
 */
router.get('/', async (_req: Request, res: Response) => {
  let db_status: 'healthy' | 'degraded' | 'down' = 'down';

  try {
    // Test database connectivity with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 2000);
    });

    await Promise.race([
      query('SELECT 1'),
      timeoutPromise,
    ]);

    db_status = 'healthy';
  } catch (error) {
    // DB is slow or unavailable - set to degraded/down
    if (error instanceof Error && error.message === 'Database query timeout') {
      db_status = 'degraded';
    } else {
      db_status = 'down';
    }
  }

  // Always return 200 even if DB is slow/degraded
  const response: HealthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    db_status,
  };

  res.json(response);
});

export default router;
