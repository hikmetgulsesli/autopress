import { Router, Response } from 'express';
import { query } from '../db/connection';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { language, limit = '50' } = req.query;
    let sql = 'SELECT * FROM trends';
    const params: any[] = [];
    if (language) { sql += ' WHERE language = $1'; params.push(language); }
    sql += ' ORDER BY score DESC LIMIT $' + (params.length + 1);
    params.push(Number(limit));
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/keywords', async (req: AuthRequest, res: Response) => {
  try {
    const { language } = req.query;
    let sql = 'SELECT * FROM keywords';
    const params: any[] = [];
    if (language) { sql += ' WHERE language = $1'; params.push(language); }
    sql += ' ORDER BY trend_score DESC LIMIT 100';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
