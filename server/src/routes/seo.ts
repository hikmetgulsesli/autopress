import { Router, Response } from 'express';
import { query } from '../db/connection';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/scores', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT id, title, slug, seo_score, meta_title, meta_description, word_count, site_id FROM articles ORDER BY seo_score ASC LIMIT 50`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

router.get('/internal-links', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT il.*, sa.title as source_title, ta.title as target_title 
       FROM internal_links il 
       JOIN articles sa ON il.source_article_id = sa.id 
       JOIN articles ta ON il.target_article_id = ta.id 
       ORDER BY il.created_at DESC`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
