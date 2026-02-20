import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/connection';
import { authenticate, AuthRequest } from '../middleware/auth';
import { config, PASSWORD_REGEX } from '../config';

const router = Router();

function generateTokens(user: { id: number; email: string; role: string }) {
  const accessToken = jwt.sign(user, config.JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign(user, config.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email ve şifre gerekli' });

    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Geçersiz kimlik bilgileri' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Geçersiz kimlik bilgileri' });

    const tokens = generateTokens({ id: user.id, email: user.email, role: user.role });
    await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [tokens.refreshToken, user.id]);

    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, ...tokens });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token gerekli' });

    const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as any;
    const result = await query('SELECT * FROM users WHERE id = $1 AND refresh_token = $2', [decoded.id, refreshToken]);
    if (!result.rows[0]) return res.status(401).json({ error: 'Geçersiz refresh token' });

    const user = result.rows[0];
    const tokens = generateTokens({ id: user.id, email: user.email, role: user.role });
    await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [tokens.refreshToken, user.id]);

    res.json(tokens);
  } catch {
    res.status(401).json({ error: 'Geçersiz refresh token' });
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT id, email, name, role, created_at FROM users WHERE id = $1', [req.user!.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await query('UPDATE users SET refresh_token = NULL WHERE id = $1', [req.user!.id]);
    res.json({ message: 'Çıkış yapıldı' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
