import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/connection';
import { authenticate, AuthRequest } from '../middleware/auth';
import { config, PASSWORD_REGEX } from '../config';
import { logSecurityEvent } from '../services/audit.service';
import { validateBody } from '../middleware/validate';
import { updateProfileSchema, changePasswordSchema } from '../middleware/schemas';

const router = Router();

// Helper to get client IP
function getClientIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
}

// Helper to get user agent
function getUserAgent(req: Request): string {
  return req.headers['user-agent'] || 'unknown';
}

// Account lockout configuration
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;
const LOCKOUT_DURATION_MS = LOCKOUT_DURATION_MINUTES * 60 * 1000;

function generateTokens(user: { id: number; email: string; role: string }) {
  const accessToken = jwt.sign(user, config.JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign(user, config.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

function getRemainingLockoutTime(lockedUntil: Date | null): number {
  if (!lockedUntil) return 0;
  const remaining = new Date(lockedUntil).getTime() - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const clientIp = getClientIp(req);
    const userAgent = getUserAgent(req);

    if (!email || !password) {
      await logSecurityEvent({
        eventType: 'LOGIN_FAILURE',
        userId: null,
        ipAddress: clientIp,
        userAgent,
        details: { reason: 'Missing email or password', email },
      });
      return res.status(400).json({ error: 'Email ve şifre gerekli' });
    }

    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) {
      await logSecurityEvent({
        eventType: 'LOGIN_FAILURE',
        userId: null,
        ipAddress: clientIp,
        userAgent,
        details: { reason: 'User not found', email },
      });
      return res.status(401).json({ error: 'Geçersiz kimlik bilgileri' });
    }

    // Check if account is currently locked
    const failedLoginAttempts = user.failed_login_attempts || 0;
    const lockedUntil = user.locked_until ? new Date(user.locked_until) : null;
    
    if (lockedUntil && lockedUntil > new Date()) {
      const remainingSeconds = getRemainingLockoutTime(lockedUntil);
      const remainingMinutes = Math.ceil(remainingSeconds / 60);
      
      await logSecurityEvent({
        eventType: 'LOGIN_FAILURE',
        userId: user.id,
        ipAddress: clientIp,
        userAgent,
        details: { reason: 'Account locked', remaining_minutes: remainingMinutes },
      });
      
      return res.status(423).json({ 
        error: 'Hesap kilitli',
        details: {
          locked: true,
          remaining_seconds: remainingSeconds,
          remaining_minutes: remainingMinutes,
          try_again_at: lockedUntil.toISOString()
        }
      });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    
    if (!valid) {
      // Increment failed login attempts
      const newFailedAttempts = failedLoginAttempts + 1;
      
      if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
        // Lock the account
        const lockoutTime = new Date(Date.now() + LOCKOUT_DURATION_MS);
        await query(
          'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
          [newFailedAttempts, lockoutTime, user.id]
        );
        
        await logSecurityEvent({
          eventType: 'LOGIN_FAILURE',
          userId: user.id,
          ipAddress: clientIp,
          userAgent,
          details: { reason: 'Account locked due to too many failed attempts', failed_attempts: newFailedAttempts },
        });
        
        return res.status(423).json({ 
          error: 'Geçersiz kimlik bilgileri',
          details: {
            locked: true,
            reason: 'Çok fazla başarısız giriş denemesi',
            locked_until: lockoutTime.toISOString()
          }
        });
      } else {
        // Just increment the counter
        await query(
          'UPDATE users SET failed_login_attempts = $1 WHERE id = $2',
          [newFailedAttempts, user.id]
        );
      }
      
      await logSecurityEvent({
        eventType: 'LOGIN_FAILURE',
        userId: user.id,
        ipAddress: clientIp,
        userAgent,
        details: { reason: 'Invalid password', failed_attempts: newFailedAttempts },
      });
      
      // Generic error message - don't reveal if email exists
      return res.status(401).json({ error: 'Geçersiz kimlik bilgileri' });
    }

    // Successful login - reset failed attempts and unlock
    await query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, refresh_token = $1 WHERE id = $2',
      [null, user.id]
    );

    const tokens = generateTokens({ id: user.id, email: user.email, role: user.role });
    await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [tokens.refreshToken, user.id]);

    await logSecurityEvent({
      eventType: 'LOGIN_SUCCESS',
      userId: user.id,
      ipAddress: clientIp,
      userAgent,
      details: { method: 'password' },
    });

    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, ...tokens });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
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
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const clientIp = getClientIp(req);
    const userAgent = getUserAgent(req);
    
    await query('UPDATE users SET refresh_token = NULL WHERE id = $1', [req.user!.id]);
    
    await logSecurityEvent({
      eventType: 'LOGOUT',
      userId: req.user!.id,
      ipAddress: clientIp,
      userAgent,
    });
    
    res.json({ message: 'Çıkış yapıldı' });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// Profile update endpoint
router.put('/profile', authenticate, validateBody(updateProfileSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    const userId = req.user!.id;

    const result = await query(
      'UPDATE users SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, name, role, created_at, updated_at',
      [name, userId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    await logSecurityEvent({
      eventType: 'PROFILE_UPDATE',
      userId,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      details: { name },
    });

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// Change password endpoint
router.put('/password', authenticate, validateBody(changePasswordSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.id;

    // Get user with password hash
    const userResult = await query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Verify current password
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      await logSecurityEvent({
        eventType: 'PASSWORD_CHANGE_FAILURE',
        userId,
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
        details: { reason: 'Invalid current password' },
      });
      return res.status(400).json({ error: 'Mevcut şifre yanlış' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, userId]
    );

    await logSecurityEvent({
      eventType: 'PASSWORD_CHANGE_SUCCESS',
      userId,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    res.json({ message: 'Şifre başarıyla değiştirildi' });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
