import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import * as schedulerService from '../services/scheduler.service';
import { query } from '../db/connection';

const router = Router();
router.use(authenticate);

/**
 * GET /api/scheduler/status
 * Get scheduler status and configuration
 */
router.get('/status', async (_req: AuthRequest, res: Response) => {
  try {
    const status = schedulerService.getSchedulerStatus();
    const stats = await schedulerService.getQueueStats();
    
    res.json({
      scheduler: status,
      queue: stats,
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

/**
 * GET /api/scheduler/queue
 * Get scheduled articles with pagination
 */
router.get('/queue', async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const offset = (Number(page || 1) - 1) * Number(limit || 20);

    const result = await schedulerService.getScheduledArticles(
      status as schedulerService.PublishStatus | undefined,
      Number(limit || 20),
      offset
    );

    res.json({
      data: result.items,
      total: result.total,
      page: Number(page || 1),
      limit: Number(limit || 20),
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

/**
 * POST /api/scheduler/schedule
 * Schedule an article for publishing
 */
router.post('/schedule', async (req: AuthRequest, res: Response) => {
  try {
    const { article_id, site_id, scheduled_at, timezone, enable_jitter, jitter_minutes } = req.body;

    if (!article_id || !scheduled_at) {
      return res.status(400).json({ error: 'article_id and scheduled_at are required' });
    }

    const scheduledDate = new Date(scheduled_at);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ error: 'Invalid scheduled_at date format' });
    }

    const queueItem = await schedulerService.scheduleArticle(
      article_id,
      site_id || null,
      scheduledDate,
      timezone || 'Europe/Istanbul',
      enable_jitter !== false,
      jitter_minutes || 15
    );

    res.status(201).json(queueItem);
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

/**
 * POST /api/scheduler/cancel/:id
 * Cancel a scheduled article
 */
router.post('/cancel/:id', async (req: AuthRequest, res: Response) => {
  try {
    const queueId = Number(req.params.id);
    const cancelled = await schedulerService.cancelScheduledArticle(queueId);

    if (cancelled) {
      res.json({ message: 'Scheduled article cancelled successfully' });
    } else {
      res.status(404).json({ error: 'Scheduled article not found or already processed' });
    }
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

/**
 * POST /api/scheduler/retry/:id
 * Retry a failed publish
 */
router.post('/retry/:id', async (req: AuthRequest, res: Response) => {
  try {
    const queueId = Number(req.params.id);
    const retried = await schedulerService.retryFailedPublish(queueId);

    if (retried) {
      res.json({ message: 'Failed publish queued for retry' });
    } else {
      res.status(404).json({ error: 'Failed publish not found or max attempts reached' });
    }
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

/**
 * POST /api/scheduler/process
 * Manually trigger queue processing (admin only)
 */
router.post('/process', async (req: AuthRequest, res: Response) => {
  try {
    // Only allow manual processing if scheduler is not currently processing
    const status = schedulerService.getSchedulerStatus();
    if (status.isProcessing) {
      return res.status(409).json({ error: 'Queue is already being processed' });
    }

    const stats = await schedulerService.processQueue();
    res.json({
      message: 'Queue processed successfully',
      stats,
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

/**
 * GET /api/scheduler/history
 * Get publish history
 */
router.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    const { article_id, limit = '50', page = '1' } = req.query;
    const offset = (Number(page || 1) - 1) * Number(limit || 20);

    let whereClause = '';
    const params: (number | string)[] = [];

    if (article_id) {
      whereClause = 'WHERE ph.article_id = $1';
      params.push(Number(article_id));
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM publish_history ph ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(Number(limit || 20), offset);
    const result = await query(
      `SELECT ph.*, a.title as article_title, s.name as site_name 
       FROM publish_history ph 
       JOIN articles a ON ph.article_id = a.id 
       LEFT JOIN sites s ON ph.site_id = s.id 
       ${whereClause}
       ORDER BY ph.published_at DESC 
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      data: result.rows,
      total,
      page: Number(page || 1),
      limit: Number(limit || 20),
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

/**
 * GET /api/scheduler/schedules
 * Get publishing schedules
 */
router.get('/schedules', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT sc.*, s.name as site_name 
       FROM schedules sc 
       JOIN sites s ON sc.site_id = s.id 
       ORDER BY sc.day_of_week, sc.publish_time`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

/**
 * POST /api/scheduler/schedules
 * Create a new publishing schedule
 */
router.post('/schedules', async (req: AuthRequest, res: Response) => {
  try {
    const { site_id, day_of_week, publish_time, publish_date, publish_datetime, timezone, jitter_enabled, jitter_minutes } = req.body;

    if (!site_id) {
      return res.status(400).json({ error: 'site_id is required' });
    }

    const result = await query(
      `INSERT INTO schedules (site_id, day_of_week, publish_time, publish_date, publish_datetime, timezone, jitter_enabled, jitter_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [site_id, day_of_week || null, publish_time || null, publish_date || null, publish_datetime || null, timezone || 'Europe/Istanbul', jitter_enabled !== false, jitter_minutes || 15]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

/**
 * PUT /api/scheduler/schedules/:id
 * Update a publishing schedule
 */
router.put('/schedules/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { day_of_week, publish_time, publish_date, publish_datetime, timezone, jitter_enabled, jitter_minutes, is_active } = req.body;

    const result = await query(
      `UPDATE schedules SET
        day_of_week = COALESCE($1, day_of_week),
        publish_time = COALESCE($2, publish_time),
        publish_date = COALESCE($3, publish_date),
        publish_datetime = COALESCE($4, publish_datetime),
        timezone = COALESCE($5, timezone),
        jitter_enabled = COALESCE($6, jitter_enabled),
        jitter_minutes = COALESCE($7, jitter_minutes),
        is_active = COALESCE($8, is_active),
        updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [day_of_week, publish_time, publish_date, publish_datetime, timezone, jitter_enabled, jitter_minutes, is_active, req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

/**
 * DELETE /api/scheduler/schedules/:id
 * Delete a publishing schedule
 */
router.delete('/schedules/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM schedules WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json({ message: 'Schedule deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
