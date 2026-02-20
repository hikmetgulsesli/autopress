import { Router, Response } from 'express';
import { query } from '../db/connection';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/queue', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT a.*, s.name as site_name FROM articles a JOIN sites s ON a.site_id = s.id WHERE a.status = 'scheduled' ORDER BY a.published_at ASC`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT ph.*, a.title as article_title, s.name as site_name 
       FROM publish_history ph 
       JOIN articles a ON ph.article_id = a.id 
       JOIN sites s ON ph.site_id = s.id 
       ORDER BY ph.published_at DESC LIMIT 50`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/schedules', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT sc.*, s.name as site_name FROM schedules sc JOIN sites s ON sc.site_id = s.id ORDER BY sc.day_of_week, sc.publish_time');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
