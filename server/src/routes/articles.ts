import { Router, Response } from 'express';
import { query } from '../db/connection';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createSlug } from '../utils/slugify';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { site_id, status, language, page = '1', limit = '20' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let where = 'WHERE 1=1';
    const params: any[] = [];
    let idx = 1;

    if (site_id) { where += ` AND a.site_id = $${idx++}`; params.push(site_id); }
    if (status) { where += ` AND a.status = $${idx++}`; params.push(status); }
    if (language) { where += ` AND a.language = $${idx++}`; params.push(language); }

    const countResult = await query(`SELECT COUNT(*) FROM articles a ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(Number(limit), offset);
    const result = await query(
      `SELECT a.*, s.name as site_name FROM articles a LEFT JOIN sites s ON a.site_id = s.id ${where} ORDER BY a.created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      params
    );
    res.json({ data: result.rows, total, page: Number(page), limit: Number(limit) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'SELECT a.*, s.name as site_name FROM articles a LEFT JOIN sites s ON a.site_id = s.id WHERE a.id = $1',
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Makale bulunamadı' });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { site_id, title, content, excerpt, status, language, meta_title, meta_description, featured_image_url, ai_model, source_trend_id } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Başlık ve içerik gerekli' });

    const slug = createSlug(title);
    const wordCount = content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200);

    const result = await query(
      `INSERT INTO articles (site_id, title, slug, content, excerpt, status, language, meta_title, meta_description, featured_image_url, word_count, reading_time, ai_model, source_trend_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [site_id, title, slug, content, excerpt, status || 'draft', language || 'tr', meta_title || title, meta_description || excerpt, featured_image_url, wordCount, readingTime, ai_model, source_trend_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { site_id, title, content, excerpt, status, language, meta_title, meta_description, featured_image_url, ai_model } = req.body;
    const slug = title ? createSlug(title) : undefined;
    const wordCount = content ? content.split(/\s+/).length : undefined;
    const readingTime = wordCount ? Math.ceil(wordCount / 200) : undefined;

    const result = await query(
      `UPDATE articles SET
        site_id = COALESCE($1, site_id), title = COALESCE($2, title), slug = COALESCE($3, slug),
        content = COALESCE($4, content), excerpt = COALESCE($5, excerpt), status = COALESCE($6, status),
        language = COALESCE($7, language), meta_title = COALESCE($8, meta_title),
        meta_description = COALESCE($9, meta_description), featured_image_url = COALESCE($10, featured_image_url),
        word_count = COALESCE($11, word_count), reading_time = COALESCE($12, reading_time),
        ai_model = COALESCE($13, ai_model), updated_at = NOW()
       WHERE id = $14 RETURNING *`,
      [site_id, title, slug, content, excerpt, status, language, meta_title, meta_description, featured_image_url, wordCount, readingTime, ai_model, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Makale bulunamadı' });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query('DELETE FROM articles WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Makale bulunamadı' });
    res.json({ message: 'Makale silindi' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
