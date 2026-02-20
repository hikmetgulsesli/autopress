import { Router, Response } from 'express';
import { query } from '../db/connection';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// List all sites
router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT * FROM sites ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get single site
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT * FROM sites WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Site bulunamadı' });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create site
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, domain, platform, platform_id, api_credentials, language, niche } = req.body;
    if (!name || !platform) return res.status(400).json({ error: 'İsim ve platform gerekli' });

    const result = await query(
      `INSERT INTO sites (name, domain, platform, platform_id, api_credentials, language, niche)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, domain, platform, platform_id, JSON.stringify(api_credentials || {}), language || 'tr', niche]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Bu domain zaten kayıtlı' });
    res.status(500).json({ error: err.message });
  }
});

// Update site
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, domain, platform, platform_id, api_credentials, language, niche, adsense_status, is_active, theme_config } = req.body;
    const result = await query(
      `UPDATE sites SET 
        name = COALESCE($1, name), domain = COALESCE($2, domain), platform = COALESCE($3, platform),
        platform_id = COALESCE($4, platform_id), api_credentials = COALESCE($5, api_credentials),
        language = COALESCE($6, language), niche = COALESCE($7, niche), adsense_status = COALESCE($8, adsense_status),
        is_active = COALESCE($9, is_active), theme_config = COALESCE($10, theme_config), updated_at = NOW()
       WHERE id = $11 RETURNING *`,
      [name, domain, platform, platform_id, api_credentials ? JSON.stringify(api_credentials) : null, language, niche, adsense_status, is_active, theme_config ? JSON.stringify(theme_config) : null, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Site bulunamadı' });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete site
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query('DELETE FROM sites WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Site bulunamadı' });
    res.json({ message: 'Site silindi' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
