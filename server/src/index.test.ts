import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock the database connection
vi.mock('./db/connection', () => ({
  query: vi.fn(),
}));

// Mock the logger
vi.mock('./utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock scheduler service - use factory that returns fresh mock each time
const mockGetSchedulerStatus = vi.fn().mockReturnValue({
  running: false,
  isProcessing: false,
  config: { cronExpression: '*/5 * * * *' },
});

vi.mock('./services/scheduler.service', () => ({
  startScheduler: vi.fn(),
  getSchedulerStatus: () => mockGetSchedulerStatus(),
}));

import { query } from './db/connection';

describe('Health Check Endpoint', () => {
  let app: express.Application;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetSchedulerStatus.mockReturnValue({
      running: false,
      isProcessing: false,
      config: { cronExpression: '*/5 * * * *' },
    });
    // Import the app fresh for each test
    vi.resetModules();
    const indexModule = await import('./index'); const importedApp = indexModule.default;
    app = importedApp;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return healthy status when DB query succeeds', async () => {
      (query as any).mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.db_status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.version).toBe('1.0.0');
      expect(response.body.scheduler).toBeDefined();
      expect(query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should return degraded status when DB query fails', async () => {
      (query as any).mockRejectedValueOnce(new Error('DB connection failed'));

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.db_status).toBe('degraded');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.scheduler).toBeDefined();
    });

    it('should return degraded status when DB query times out', async () => {
      // Mock query that never resolves (simulating timeout)
      (query as any).mockImplementationOnce(() => new Promise(() => {}));

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.db_status).toBe('degraded');
    });

    it('should include scheduler status in response', async () => {
      (query as any).mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.scheduler).toEqual({
        running: false,
        isProcessing: false,
        config: { cronExpression: '*/5 * * * *' },
      });
    });

    it('should return 200 even when database is slow', async () => {
      // Simulate slow DB query (less than 2s timeout)
      (query as any).mockImplementationOnce(() => 
        new Promise((resolve) => 
          setTimeout(() => resolve({ rows: [{ '?column?': 1 }] }), 100)
        )
      );

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.db_status).toBe('healthy');
    });
  });
});
