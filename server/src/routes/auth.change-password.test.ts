import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../index';
import { query } from '../db/connection';
import jwt from 'jsonwebtoken';

// Mock dependencies
vi.mock('../db/connection', () => ({
  query: vi.fn(),
}));

vi.mock('../services/audit.service', () => ({
  logSecurityEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../config', async () => {
  const actual = await vi.importActual('../config');
  return {
    ...actual,
    config: {
      JWT_SECRET: 'test-secret-key-that-is-at-least-32-characters-long',
      JWT_REFRESH_SECRET: 'test-refresh-secret-key',
    },
  };
});

describe('PUT /api/auth/change-password', () => {
  const mockUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    password_hash: '$2a$10$abcdefghijklmnopqrstuvwxyz12345678901234567890123456',
    failed_login_attempts: 0,
    locked_until: null,
  };

  const generateToken = (userId: number, email: string, role: string) => {
    return jwt.sign(
      { id: userId, email, role },
      'test-secret-key-that-is-at-least-32-characters-long',
      { expiresIn: '1h' }
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should change password successfully with valid credentials', async () => {
    const token = generateToken(mockUser.id, mockUser.email, mockUser.role);
    const currentPassword = 'CurrentPass123!';
    const newPassword = 'NewPass123!';

    // Mock user lookup
    vi.mocked(query)
      .mockResolvedValueOnce({
        rows: [{
          ...mockUser,
          password_hash: await bcrypt.hash(currentPassword, 10),
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      })
      .mockResolvedValueOnce({
        rows: [],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

    const response = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword,
        newPassword,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Şifre başarıyla değiştirildi');
  });

  it('should return 400 when current password is incorrect', async () => {
    const token = generateToken(mockUser.id, mockUser.email, mockUser.role);
    const wrongPassword = 'WrongPass123!';
    const newPassword = 'NewPass123!';

    // Mock user lookup with a different password hash
    vi.mocked(query).mockResolvedValueOnce({
      rows: [{
        ...mockUser,
        password_hash: await bcrypt.hash('CorrectPass123!', 10),
      }],
      command: 'SELECT',
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    const response = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: wrongPassword,
        newPassword,
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Mevcut şifre yanlış');
  });

  it('should return 404 when user is not found', async () => {
    const token = generateToken(mockUser.id, mockUser.email, mockUser.role);

    // Mock user not found
    vi.mocked(query).mockResolvedValueOnce({
      rows: [],
      command: 'SELECT',
      rowCount: 0,
      oid: 0,
      fields: [],
    });

    const response = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'AnyPass123!',
        newPassword: 'NewPass123!',
      });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Kullanıcı bulunamadı');
  });

  it('should return 401 when no token is provided', async () => {
    const response = await request(app)
      .put('/api/auth/change-password')
      .send({
        currentPassword: 'CurrentPass123!',
        newPassword: 'NewPass123!',
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Token gerekli');
  });

  it('should return 401 when token is invalid', async () => {
    const response = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', 'Bearer invalid-token')
      .send({
        currentPassword: 'CurrentPass123!',
        newPassword: 'NewPass123!',
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Geçersiz token');
  });

  it('should return 400 when currentPassword is missing', async () => {
    const token = generateToken(mockUser.id, mockUser.email, mockUser.role);

    const response = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        newPassword: 'NewPass123!',
      });

    expect(response.status).toBe(400);
  });

  it('should return 400 when newPassword is missing', async () => {
    const token = generateToken(mockUser.id, mockUser.email, mockUser.role);

    const response = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'CurrentPass123!',
      });

    expect(response.status).toBe(400);
  });

  it('should return 400 when newPassword is too short', async () => {
    const token = generateToken(mockUser.id, mockUser.email, mockUser.role);

    const response = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'CurrentPass123!',
        newPassword: 'short',
      });

    expect(response.status).toBe(400);
  });

  it('should hash new password with bcrypt before storing', async () => {
    const token = generateToken(mockUser.id, mockUser.email, mockUser.role);
    const currentPassword = 'CurrentPass123!';
    const newPassword = 'NewSecurePass123!';

    // Mock user lookup
    vi.mocked(query)
      .mockResolvedValueOnce({
        rows: [{
          ...mockUser,
          password_hash: await bcrypt.hash(currentPassword, 10),
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      })
      .mockResolvedValueOnce({
        rows: [],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

    const response = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword,
        newPassword,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    // Verify that query was called with a hashed password (bcrypt hash starts with $2)
    const updateCall = vi.mocked(query).mock.calls[1];
    expect(updateCall[1]?.[0]).toMatch(/^\$2[aby]\$/);
  });
});
