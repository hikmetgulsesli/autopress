import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock the database query
vi.mock('../db/connection', () => ({
  query: vi.fn(),
}));

import healthRouter from '../routes/health';
import * as dbModule from '../db/connection';

const mockQuery = vi.mocked(dbModule.query);

describe('Health Check API', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use('/api/health', healthRouter);
  });

  describe('GET /api/health', () => {
    it('should return healthy status when DB responds', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ result: 1 }] });

      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.db_status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.version).toBe('1.0.0');
      expect(mockQuery).toHaveBeenCalledWith('SELECT 1');
    });

    it('should return degraded status when DB query times out', async () => {
      // Simulate a slow DB query by taking longer than timeout
      mockQuery.mockImplementationOnce(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ rows: [] }), 3000);
        });
      });

      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.db_status).toBe('degraded');
    });

    it('should return down status when DB query fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection failed'));

      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.db_status).toBe('down');
      expect(mockQuery).toHaveBeenCalledWith('SELECT 1');
    });

    it('should return down status when DB is unreachable', async () => {
      mockQuery.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.db_status).toBe('down');
    });

    it('should always return 200 even when DB is down', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database unavailable'));

      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
    });

    it('should always return 200 even when DB times out', async () => {
      mockQuery.mockImplementationOnce(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ rows: [] }), 3000);
        });
      });

      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
    });

    it('should include timestamp in ISO format', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get('/api/health');

      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(() => new Date(response.body.timestamp)).not.toThrow();
    });

    it('should include version number', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get('/api/health');

      expect(response.body.version).toBe('1.0.0');
    });
  });
});
