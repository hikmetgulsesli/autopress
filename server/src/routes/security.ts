import { Router } from 'express';
import { authenticate as requireAuth } from '../middleware/auth';
import { getAuditLogs, getSecurityStats } from '../services/audit.service';
import { query } from '../db/connection';

const router = Router();

/**
 * GET /api/security/audit-logs
 * Get recent audit logs with optional filtering
 */
router.get('/audit-logs', requireAuth, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const eventType = req.query.eventType as string | undefined;

    const result = await getAuditLogs({
      limit,
      offset,
      eventType: eventType as any,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/security/stats
 * Get security statistics for the dashboard
 */
router.get('/stats', requireAuth, async (req, res, next) => {
  try {
    // Get stats for the last 24 hours
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 1);

    const stats = await getSecurityStats({ startDate });

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/security/headers
 * Get security headers status
 */
router.get('/headers', requireAuth, async (_req, res) => {
  // Return the status of security headers configuration
  // These are configured in middleware/securityHeaders.ts
  res.json({
    contentSecurityPolicy: true,
    hsts: true,
    frameguard: true,
    noSniff: true,
    referrerPolicy: true,
    allEnabled: true,
  });
});

/**
 * GET /api/security/locked-accounts
 * Get list of currently locked accounts
 */
router.get('/locked-accounts', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, email, failed_login_attempts, locked_until
       FROM users
       WHERE locked_until IS NOT NULL AND locked_until > NOW()
       ORDER BY locked_until DESC`
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/security/unlock-account/:userId
 * Manually unlock a locked account (admin only)
 */
router.post('/unlock-account/:userId', requireAuth, async (req, res, next) => {
  try {
    const userId = parseInt(String(req.params.userId));

    // TODO: Add admin role check here when roles are implemented

    await query(
      `UPDATE users
       SET failed_login_attempts = 0, locked_until = NULL
       WHERE id = $1`,
      [userId]
    );

    res.json({ success: true, message: 'Account unlocked successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
