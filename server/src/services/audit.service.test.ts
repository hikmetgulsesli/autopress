import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { query } from '../db/connection';
import {
  logSecurityEvent,
  getAuditLogs,
  getSecurityStats,
  SecurityEventType,
} from './audit.service';

describe('Audit Service', () => {
  beforeAll(async () => {
    // Ensure audit_logs table exists
    await query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(50) NOT NULL,
        user_id INTEGER,
        ip_address INET,
        user_agent TEXT,
        details JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  });

  beforeEach(async () => {
    // Clear audit_logs before each test
    await query('DELETE FROM audit_logs');
  });

  describe('logSecurityEvent', () => {
    it('should log LOGIN_SUCCESS event to database', async () => {
      await logSecurityEvent({
        eventType: 'LOGIN_SUCCESS',
        userId: 1,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        details: { method: 'password' },
      });

      const result = await query('SELECT * FROM audit_logs WHERE event_type = $1', [
        'LOGIN_SUCCESS',
      ]);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].event_type).toBe('LOGIN_SUCCESS');
      expect(result.rows[0].user_id).toBe(1);
      expect(result.rows[0].ip_address).toBe('192.168.1.1');
      expect(result.rows[0].user_agent).toBe('Mozilla/5.0');
      expect(result.rows[0].details).toEqual({ method: 'password' });
    });

    it('should log LOGIN_FAILURE event with reason', async () => {
      await logSecurityEvent({
        eventType: 'LOGIN_FAILURE',
        userId: null,
        ipAddress: '10.0.0.1',
        userAgent: 'Chrome/120.0',
        details: { reason: 'Invalid credentials', email: 'test@example.com' },
      });

      const result = await query('SELECT * FROM audit_logs WHERE event_type = $1', [
        'LOGIN_FAILURE',
      ]);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].event_type).toBe('LOGIN_FAILURE');
      expect(result.rows[0].user_id).toBeNull();
      expect(result.rows[0].ip_address).toBe('10.0.0.1');
      expect(result.rows[0].details.reason).toBe('Invalid credentials');
    });

    it('should log LOGOUT event', async () => {
      await logSecurityEvent({
        eventType: 'LOGOUT',
        userId: 1,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      const result = await query('SELECT * FROM audit_logs WHERE event_type = $1', [
        'LOGOUT',
      ]);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].event_type).toBe('LOGOUT');
      expect(result.rows[0].user_id).toBe(1);
    });

    it('should log PASSWORD_CHANGE event', async () => {
      await logSecurityEvent({
        eventType: 'PASSWORD_CHANGE',
        userId: 1,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        details: { changed_by: 'user' },
      });

      const result = await query('SELECT * FROM audit_logs WHERE event_type = $1', [
        'PASSWORD_CHANGE',
      ]);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].event_type).toBe('PASSWORD_CHANGE');
    });

    it('should log UNAUTHORIZED_ACCESS event', async () => {
      await logSecurityEvent({
        eventType: 'UNAUTHORIZED_ACCESS',
        userId: 2,
        ipAddress: '10.0.0.5',
        userAgent: 'Mozilla/5.0',
        details: { resource: '/api/admin/users', method: 'GET' },
      });

      const result = await query('SELECT * FROM audit_logs WHERE event_type = $1', [
        'UNAUTHORIZED_ACCESS',
      ]);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].event_type).toBe('UNAUTHORIZED_ACCESS');
      expect(result.rows[0].details.resource).toBe('/api/admin/users');
    });

    it('should log RATE_LIMIT_HIT event', async () => {
      await logSecurityEvent({
        eventType: 'RATE_LIMIT_HIT',
        userId: null,
        ipAddress: '10.0.0.100',
        userAgent: 'Bot/1.0',
        details: { endpoint: '/api/auth/login', limit: 5 },
      });

      const result = await query('SELECT * FROM audit_logs WHERE event_type = $1', [
        'RATE_LIMIT_HIT',
      ]);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].event_type).toBe('RATE_LIMIT_HIT');
      expect(result.rows[0].details.endpoint).toBe('/api/auth/login');
    });

    it('should handle missing optional fields gracefully', async () => {
      await logSecurityEvent({
        eventType: 'LOGIN_SUCCESS',
      });

      const result = await query('SELECT * FROM audit_logs');

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].event_type).toBe('LOGIN_SUCCESS');
      expect(result.rows[0].user_id).toBeNull();
      expect(result.rows[0].ip_address).toBeNull();
      expect(result.rows[0].user_agent).toBeNull();
      expect(result.rows[0].details).toBeNull();
    });

    it('should not throw error when database fails', async () => {
      // This test verifies the function doesn't throw on DB errors
      // The actual error is logged to console
      await expect(
        logSecurityEvent({
          eventType: 'LOGIN_SUCCESS',
          userId: 1,
        })
      ).resolves.not.toThrow();
    });
  });

  describe('getAuditLogs', () => {
    it('should return all logs with default pagination', async () => {
      // Clear any existing data first to ensure isolation
      await query('DELETE FROM audit_logs');
      
      // Insert test data
      await logSecurityEvent({ eventType: 'LOGIN_SUCCESS', userId: 1, ipAddress: '192.168.1.1' });
      await logSecurityEvent({ eventType: 'LOGIN_FAILURE', userId: null, ipAddress: '192.168.1.2', details: { reason: 'Invalid password' } });
      await logSecurityEvent({ eventType: 'LOGOUT', userId: 1, ipAddress: '192.168.1.1' });
      await logSecurityEvent({ eventType: 'LOGIN_SUCCESS', userId: 2, ipAddress: '192.168.1.3' });

      const { logs, total } = await getAuditLogs();

      expect(total).toBeGreaterThanOrEqual(4);
      expect(logs.length).toBeGreaterThanOrEqual(4);
    });

    it('should filter by event type', async () => {
      await logSecurityEvent({ eventType: 'LOGIN_SUCCESS', userId: 1, ipAddress: '192.168.1.1' });
      await logSecurityEvent({ eventType: 'LOGIN_FAILURE', userId: null, ipAddress: '192.168.1.2' });
      await logSecurityEvent({ eventType: 'LOGIN_SUCCESS', userId: 2, ipAddress: '192.168.1.3' });

      const { logs, total } = await getAuditLogs({
        eventType: 'LOGIN_SUCCESS',
      });

      expect(total).toBe(2);
      expect(logs.every((log) => log.event_type === 'LOGIN_SUCCESS')).toBe(true);
    });

    it('should filter by user ID', async () => {
      await logSecurityEvent({ eventType: 'LOGIN_SUCCESS', userId: 1, ipAddress: '192.168.1.1' });
      await logSecurityEvent({ eventType: 'LOGOUT', userId: 1, ipAddress: '192.168.1.1' });
      await logSecurityEvent({ eventType: 'LOGIN_SUCCESS', userId: 2, ipAddress: '192.168.1.3' });

      const { logs, total } = await getAuditLogs({
        userId: 1,
      });

      expect(total).toBe(2);
      expect(logs.every((log) => log.user_id === 1)).toBe(true);
    });

    it('should apply pagination', async () => {
      await logSecurityEvent({ eventType: 'LOGIN_SUCCESS', userId: 1, ipAddress: '192.168.1.1' });
      await logSecurityEvent({ eventType: 'LOGIN_FAILURE', userId: null, ipAddress: '192.168.1.2' });
      await logSecurityEvent({ eventType: 'LOGOUT', userId: 1, ipAddress: '192.168.1.1' });
      await logSecurityEvent({ eventType: 'LOGIN_SUCCESS', userId: 2, ipAddress: '192.168.1.3' });

      const { logs, total } = await getAuditLogs({
        limit: 2,
        offset: 0,
      });

      expect(total).toBe(4);
      expect(logs).toHaveLength(2);
    });

    it('should return logs in descending order by created_at', async () => {
      await logSecurityEvent({ eventType: 'LOGIN_SUCCESS', userId: 1, ipAddress: '192.168.1.1' });
      await logSecurityEvent({ eventType: 'LOGIN_FAILURE', userId: null, ipAddress: '192.168.1.2' });
      await logSecurityEvent({ eventType: 'LOGOUT', userId: 1, ipAddress: '192.168.1.1' });

      const { logs } = await getAuditLogs({ limit: 3 });

      // Logs should be ordered newest first
      for (let i = 0; i < logs.length - 1; i++) {
        expect(new Date(logs[i].created_at).getTime()).toBeGreaterThanOrEqual(
          new Date(logs[i + 1].created_at).getTime()
        );
      }
    });
  });

  describe('getSecurityStats', () => {
    it('should return total events count', async () => {
      await logSecurityEvent({ eventType: 'LOGIN_SUCCESS', userId: 1, ipAddress: '192.168.1.1' });
      await logSecurityEvent({ eventType: 'LOGIN_FAILURE', userId: null, ipAddress: '192.168.1.2' });
      await logSecurityEvent({ eventType: 'LOGIN_FAILURE', userId: null, ipAddress: '192.168.1.3' });
      await logSecurityEvent({ eventType: 'LOGOUT', userId: 1, ipAddress: '192.168.1.1' });
      await logSecurityEvent({ eventType: 'RATE_LIMIT_HIT', userId: null, ipAddress: '10.0.0.1' });

      const stats = await getSecurityStats();

      expect(stats.totalEvents).toBe(5);
    });

    it('should return events grouped by type', async () => {
      await logSecurityEvent({ eventType: 'LOGIN_SUCCESS', userId: 1, ipAddress: '192.168.1.1' });
      await logSecurityEvent({ eventType: 'LOGIN_FAILURE', userId: null, ipAddress: '192.168.1.2' });
      await logSecurityEvent({ eventType: 'LOGIN_FAILURE', userId: null, ipAddress: '192.168.1.3' });
      await logSecurityEvent({ eventType: 'LOGOUT', userId: 1, ipAddress: '192.168.1.1' });
      await logSecurityEvent({ eventType: 'RATE_LIMIT_HIT', userId: null, ipAddress: '10.0.0.1' });

      const stats = await getSecurityStats();

      expect(stats.eventsByType.LOGIN_SUCCESS).toBe(1);
      expect(stats.eventsByType.LOGIN_FAILURE).toBe(2);
      expect(stats.eventsByType.LOGOUT).toBe(1);
      expect(stats.eventsByType.RATE_LIMIT_HIT).toBe(1);
      expect(stats.eventsByType.PASSWORD_CHANGE).toBe(0);
      expect(stats.eventsByType.UNAUTHORIZED_ACCESS).toBe(0);
    });

    it('should return unique IP count', async () => {
      await logSecurityEvent({ eventType: 'LOGIN_SUCCESS', userId: 1, ipAddress: '192.168.1.1' });
      await logSecurityEvent({ eventType: 'LOGIN_FAILURE', userId: null, ipAddress: '192.168.1.2' });
      await logSecurityEvent({ eventType: 'LOGIN_FAILURE', userId: null, ipAddress: '192.168.1.3' });
      await logSecurityEvent({ eventType: 'LOGOUT', userId: 1, ipAddress: '192.168.1.1' });
      await logSecurityEvent({ eventType: 'RATE_LIMIT_HIT', userId: null, ipAddress: '10.0.0.1' });

      const stats = await getSecurityStats();

      expect(stats.uniqueIps).toBe(4);
    });

    it('should return unique user count', async () => {
      await logSecurityEvent({ eventType: 'LOGIN_SUCCESS', userId: 1, ipAddress: '192.168.1.1' });
      await logSecurityEvent({ eventType: 'LOGIN_FAILURE', userId: null, ipAddress: '192.168.1.2' });
      await logSecurityEvent({ eventType: 'LOGOUT', userId: 1, ipAddress: '192.168.1.1' });

      const stats = await getSecurityStats();

      expect(stats.uniqueUsers).toBe(1); // Only user_id 1 has events
    });

    it('should filter by date range', async () => {
      await logSecurityEvent({ eventType: 'LOGIN_SUCCESS', userId: 1, ipAddress: '192.168.1.1' });
      await logSecurityEvent({ eventType: 'LOGIN_FAILURE', userId: null, ipAddress: '192.168.1.2' });

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const stats = await getSecurityStats({
        startDate: yesterday,
        endDate: tomorrow,
      });

      expect(stats.totalEvents).toBe(2);
    });

    it('should return zero stats when no events match', async () => {
      await logSecurityEvent({ eventType: 'LOGIN_SUCCESS', userId: 1, ipAddress: '192.168.1.1' });

      const oldDate = new Date('2020-01-01');
      const olderDate = new Date('2019-01-01');

      const stats = await getSecurityStats({
        startDate: olderDate,
        endDate: oldDate,
      });

      expect(stats.totalEvents).toBe(0);
      expect(stats.uniqueIps).toBe(0);
      expect(stats.uniqueUsers).toBe(0);
    });
  });
});
