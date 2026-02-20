import { Router, Response } from 'express';
import { query } from '../db/connection';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validate';
import { updateSettingSchema, settingKeyParamSchema } from '../middleware/schemas';

const router = Router();
router.use(authenticate);

router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT * FROM settings ORDER BY key');
    const settings: Record<string, unknown> = {};
    for (const row of result.rows) {
      if (row.type === 'number') settings[row.key] = Number(row.value);
      else if (row.type === 'boolean') settings[row.key] = row.value === 'true';
      else if (row.type === 'json') settings[row.key] = JSON.parse(row.value);
      else settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:key', validateParams(settingKeyParamSchema), validateBody(updateSettingSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { value, type } = req.body;
    const result = await query(
      'UPDATE settings SET value = $1, type = COALESCE($2, type) WHERE key = $3 RETURNING *',
      [String(value), type, req.params.key]
    );
    if (!result.rows[0]) {
      const insert = await query(
        'INSERT INTO settings (key, value, type) VALUES ($1, $2, $3) RETURNING *',
        [req.params.key, String(value), type || 'string']
      );
      return res.json(insert.rows[0]);
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
