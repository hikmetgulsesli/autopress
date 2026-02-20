import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthRequest extends Request {
  user?: { id: number; email: string; role: string };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token gerekli' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    next();
  } catch {
    return res.status(401).json({ error: 'Geçersiz token' });
  }
}

// Alias for authenticate - used by security routes
export const requireAuth = authenticate;
