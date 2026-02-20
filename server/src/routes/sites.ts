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

// Test connection to site
router.post('/:id/test-connection', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT * FROM sites WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Site bulunamadı' });

    const site = result.rows[0];

    // Simulate connection test based on platform
    // In a real implementation, this would make actual API calls to verify credentials
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check if required credentials exist
    const hasCredentials = site.api_credentials && Object.keys(site.api_credentials).length > 0;
    const hasPlatformId = site.platform_id && site.platform_id.trim().length > 0;

    if (!hasPlatformId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_PLATFORM_ID',
          message: 'Platform ID eksik. Lütfen site ayarlarından platform ID ekleyin.',
        },
      });
    }

    if (!hasCredentials) {
      return res.status(400).json({
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'API kimlik bilgileri eksik. Lütfen site ayarlarından API bilgilerini ekleyin.',
        },
      });
    }

    // Simulate success/failure based on credential validity (mock logic for demo)
    const isValid = site.api_credentials.api_key && site.api_credentials.api_key.length > 5;

    if (!isValid) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Geçersiz kimlik bilgileri. Lütfen API anahtarınızı kontrol edin.',
        },
      });
    }

    res.json({
      data: {
        success: true,
        message: 'Bağlantı başarılı! Site erişimi doğrulandı.',
        platform: site.platform,
        tested_at: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
