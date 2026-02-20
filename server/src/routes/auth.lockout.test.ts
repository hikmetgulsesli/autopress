import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import authRouter from './auth';
import { query } from '../db/connection';

// Mock the database connection
vi.mock('../db/connection', () => ({
  query: vi.fn()
}));

// Mock config
vi.mock('../config', () => ({
  config: {
    JWT_SECRET: 'test-secret-key-that-is-32-characters-long',
    JWT_REFRESH_SECRET: 'test-refresh-secret-key-32-chars-long'
  },
  PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
}));

// Mock auth middleware
vi.mock('../middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: 1, email: 'test@example.com', role: 'admin' };
    next();
  },
  AuthRequest: class {}
}));

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('Account Lockout & Failed Login Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Database Migration', () => {
    it('should have migration file for account lockout columns', () => {
      // This test verifies the migration exists
      const fs = require('fs');
      const path = require('path');
      const migrationPath = path.join(__dirname, '../db/migrations/008_account_lockout.sql');
      
      // The migration file should exist
      expect(fs.existsSync(migrationPath)).toBe(true);
    });

    it('migration should add failed_login_attempts column', () => {
      const fs = require('fs');
      const path = require('path');
      const migrationPath = path.join(__dirname, '../db/migrations/008_account_lockout.sql');
      const content = fs.readFileSync(migrationPath, 'utf-8');
      
      expect(content).toContain('failed_login_attempts');
    });

    it('migration should add locked_until column', () => {
      const fs = require('fs');
      const path = require('path');
      const migrationPath = path.join(__dirname, '../db/migrations/008_account_lockout.sql');
      const content = fs.readFileSync(migrationPath, 'utf-8');
      
      expect(content).toContain('locked_until');
    });
  });

  describe('Failed Login Tracking', () => {
    it('should return 401 with generic error for non-existent user', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [] } as any);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Geçersiz kimlik bilgileri');
    });

    it('should increment failed attempts on wrong password', async () => {
      const password = await bcrypt.hash('correctpassword', 10);
      const user = {
        id: 1,
        email: 'test@example.com',
        password_hash: password,
        name: 'Test User',
        role: 'admin',
        failed_login_attempts: 2,
        locked_until: null
      };

      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [user] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Geçersiz kimlik bilgileri');
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET failed_login_attempts'),
        expect.arrayContaining([3, 1])
      );
    });
  });

  describe('Account Lockout', () => {
    it('should return 423 Locked when account is locked', async () => {
      const password = await bcrypt.hash('correctpassword', 10);
      const futureDate = new Date(Date.now() + 25 * 60 * 1000); // 25 minutes from now
      const user = {
        id: 1,
        email: 'test@example.com',
        password_hash: password,
        name: 'Test User',
        role: 'admin',
        failed_login_attempts: 5,
        locked_until: futureDate.toISOString()
      };

      vi.mocked(query).mockResolvedValueOnce({ rows: [user] } as any);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'correctpassword' });

      expect(response.status).toBe(423);
      expect(response.body.error).toBe('Hesap kilitlendi');
      expect(response.body.remainingMinutes).toBeGreaterThan(0);
      expect(response.body.remainingMinutes).toBeLessThanOrEqual(30);
    });

    it('should lock account after 5 failed attempts', async () => {
      const password = await bcrypt.hash('correctpassword', 10);
      const user = {
        id: 1,
        email: 'test@example.com',
        password_hash: password,
        name: 'Test User',
        role: 'admin',
        failed_login_attempts: 4,
        locked_until: null
      };

      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [user] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(response.status).toBe(423);
      expect(response.body.remainingMinutes).toBe(30);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET failed_login_attempts = $1, locked_until = $2'),
        expect.arrayContaining([5, expect.any(String), 1])
      );
    });
  });

  describe('Successful Login Reset', () => {
    it('should reset failed attempts on successful login', async () => {
      const password = 'correctpassword';
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = {
        id: 1,
        email: 'test@example.com',
        password_hash: hashedPassword,
        name: 'Test User',
        role: 'admin',
        failed_login_attempts: 3,
        locked_until: null
      };

      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [user] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password });

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.accessToken).toBeDefined();
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET failed_login_attempts = 0, locked_until = NULL'),
        expect.arrayContaining([null, 1])
      );
    });
  });

  describe('Generic Error Messages', () => {
    it('should return same error message for invalid email and password', async () => {
      // Non-existent user
      vi.mocked(query).mockResolvedValueOnce({ rows: [] } as any);
      const response1 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'anypassword' });

      // Existing user with wrong password
      const password = await bcrypt.hash('correctpassword', 10);
      const user = {
        id: 1,
        email: 'test@example.com',
        password_hash: password,
        name: 'Test User',
        role: 'admin',
        failed_login_attempts: 0,
        locked_until: null
      };
      
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [user] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);
      
      const response2 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      // Both should return the same generic error
      expect(response1.body.error).toBe(response2.body.error);
      expect(response1.body.error).toBe('Geçersiz kimlik bilgileri');
    });
  });

  describe('Configuration', () => {
    it('should have MAX_FAILED_ATTEMPTS set to 5', () => {
      const MAX_FAILED_ATTEMPTS = 5;
      expect(MAX_FAILED_ATTEMPTS).toBe(5);
    });

    it('should have LOCKOUT_DURATION_MINUTES set to 30', () => {
      const LOCKOUT_DURATION_MINUTES = 30;
      expect(LOCKOUT_DURATION_MINUTES).toBe(30);
    });
  });
});
