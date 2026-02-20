import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import publishRouter from '../routes/publish';
import * as schedulerService from '../services/scheduler.service';

// Mock the scheduler service
vi.mock('../services/scheduler.service', () => ({
  scheduleArticle: vi.fn(),
  cancelScheduledArticle: vi.fn(),
  PublishQueueItem: {},
  generateJitter: vi.fn(() => 5),
  applyJitter: vi.fn((date: Date, jitter: number) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() + jitter);
    return d;
  }),
}));

// Mock the database connection
vi.mock('../db/connection', () => ({
  query: vi.fn(),
}));

// Mock the auth middleware
vi.mock('../middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: 1, email: 'test@example.com' };
    next();
  },
  AuthRequest: {},
}));

import { query } from '../db/connection';

describe('Publish Routes - Unified Scheduling', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/publish', publishRouter);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/publish/schedule', () => {
    it('should use scheduler.service.scheduleArticle for unified scheduling', async () => {
      const mockQueueItem = {
        id: 123,
        article_id: 1,
        site_id: 2,
        scheduled_at: new Date('2024-01-15T12:00:00Z'),
        jitter_minutes: 5,
        status: 'pending',
      };

      (schedulerService.scheduleArticle as any).mockResolvedValueOnce(mockQueueItem);

      const response = await request(app)
        .post('/api/publish/schedule')
        .send({
          articleId: 1,
          siteId: 2,
          platform: 'wordpress',
          scheduledAt: '2024-01-15T12:00:00Z',
          timezone: 'Europe/Istanbul',
          enableJitter: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        queueId: 123,
        articleId: 1,
        siteId: 2,
        scheduledAt: expect.any(String),
        jitterMinutes: 5,
        status: 'pending',
      });

      // Verify scheduleArticle was called with correct parameters
      expect(schedulerService.scheduleArticle).toHaveBeenCalledWith(
        1, // articleId
        2, // siteId
        expect.any(Date), // scheduledAt
        'Europe/Istanbul', // timezone
        true, // enableJitter
        15 // maxJitterMinutes
      );

      // Verify the scheduled date is passed correctly
      const callArgs = (schedulerService.scheduleArticle as any).mock.calls[0];
      expect(callArgs[2].toISOString()).toBe('2024-01-15T12:00:00.000Z');
    });

    it('should use default timezone when not provided', async () => {
      const mockQueueItem = {
        id: 123,
        article_id: 1,
        site_id: 2,
        scheduled_at: new Date('2024-01-15T12:00:00Z'),
        jitter_minutes: 0,
        status: 'pending',
      };

      (schedulerService.scheduleArticle as any).mockResolvedValueOnce(mockQueueItem);

      const response = await request(app)
        .post('/api/publish/schedule')
        .send({
          articleId: 1,
          siteId: 2,
          platform: 'wordpress',
          scheduledAt: '2024-01-15T12:00:00Z',
        });

      expect(response.status).toBe(201);

      // Verify default timezone is used
      expect(schedulerService.scheduleArticle).toHaveBeenCalledWith(
        1,
        2,
        expect.any(Date),
        'Europe/Istanbul',
        true,
        15
      );
    });

    it('should allow disabling jitter', async () => {
      const mockQueueItem = {
        id: 123,
        article_id: 1,
        site_id: 2,
        scheduled_at: new Date('2024-01-15T12:00:00Z'),
        jitter_minutes: 0,
        status: 'pending',
      };

      (schedulerService.scheduleArticle as any).mockResolvedValueOnce(mockQueueItem);

      const response = await request(app)
        .post('/api/publish/schedule')
        .send({
          articleId: 1,
          siteId: 2,
          platform: 'wordpress',
          scheduledAt: '2024-01-15T12:00:00Z',
          enableJitter: false,
        });

      expect(response.status).toBe(201);

      // Verify jitter is disabled
      expect(schedulerService.scheduleArticle).toHaveBeenCalledWith(
        1,
        2,
        expect.any(Date),
        'Europe/Istanbul',
        false,
        15
      );
    });

    it('should return 400 for invalid platform', async () => {
      const response = await request(app)
        .post('/api/publish/schedule')
        .send({
          articleId: 1,
          siteId: 2,
          platform: 'invalid_platform',
          scheduledAt: '2024-01-15T12:00:00Z',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(schedulerService.scheduleArticle).not.toHaveBeenCalled();
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/publish/schedule')
        .send({
          articleId: 1,
          // missing siteId, platform, scheduledAt
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(schedulerService.scheduleArticle).not.toHaveBeenCalled();
    });

    it('should handle scheduler service errors with typed error codes', async () => {
      (schedulerService.scheduleArticle as any).mockRejectedValueOnce({
        code: 'SCHEDULE_ERROR',
        message: 'Database connection failed',
      });

      const response = await request(app)
        .post('/api/publish/schedule')
        .send({
          articleId: 1,
          siteId: 2,
          platform: 'wordpress',
          scheduledAt: '2024-01-15T12:00:00Z',
        });

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('SCHEDULE_ERROR');
      expect(response.body.error.message).toBe('Database connection failed');
    });

    it('should handle generic errors', async () => {
      (schedulerService.scheduleArticle as any).mockRejectedValueOnce(new Error('Unexpected error'));

      const response = await request(app)
        .post('/api/publish/schedule')
        .send({
          articleId: 1,
          siteId: 2,
          platform: 'wordpress',
          scheduledAt: '2024-01-15T12:00:00Z',
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Unexpected error');
    });

    it('should accept blogger as valid platform', async () => {
      const mockQueueItem = {
        id: 124,
        article_id: 2,
        site_id: 3,
        scheduled_at: new Date('2024-01-15T12:00:00Z'),
        jitter_minutes: 5,
        status: 'pending',
      };

      (schedulerService.scheduleArticle as any).mockResolvedValueOnce(mockQueueItem);

      const response = await request(app)
        .post('/api/publish/schedule')
        .send({
          articleId: 2,
          siteId: 3,
          platform: 'blogger',
          scheduledAt: '2024-01-15T12:00:00Z',
        });

      expect(response.status).toBe(201);
      expect(schedulerService.scheduleArticle).toHaveBeenCalled();
    });
  });

  describe('Unified Scheduling Pipeline', () => {
    it('should only use publish_queue table through scheduler service', async () => {
      // This test verifies that the endpoint uses scheduler.service
      // which handles the publish_queue insert internally
      const mockQueueItem = {
        id: 125,
        article_id: 5,
        site_id: 10,
        scheduled_at: new Date('2024-06-01T10:00:00Z'),
        jitter_minutes: -3,
        status: 'pending',
      };

      (schedulerService.scheduleArticle as any).mockResolvedValueOnce(mockQueueItem);

      await request(app)
        .post('/api/publish/schedule')
        .send({
          articleId: 5,
          siteId: 10,
          platform: 'wordpress',
          scheduledAt: '2024-06-01T10:00:00Z',
        });

      // Verify scheduleArticle was called (which internally uses publish_queue)
      expect(schedulerService.scheduleArticle).toHaveBeenCalledTimes(1);

      // Verify no direct DB queries were made for scheduling
      // (the route should not directly insert into publish_queue or publish_history)
      const insertCalls = (query as any).mock.calls.filter(
        (call: any[]) => call[0]?.toLowerCase().includes('insert')
      );
      expect(insertCalls).toHaveLength(0);
    });

    it('should include jitter information in response', async () => {
      const mockQueueItem = {
        id: 126,
        article_id: 6,
        site_id: 11,
        scheduled_at: new Date('2024-06-01T10:05:00Z'), // jittered time
        jitter_minutes: 5,
        status: 'pending',
      };

      (schedulerService.scheduleArticle as any).mockResolvedValueOnce(mockQueueItem);

      const response = await request(app)
        .post('/api/publish/schedule')
        .send({
          articleId: 6,
          siteId: 11,
          platform: 'wordpress',
          scheduledAt: '2024-06-01T10:00:00Z',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.jitterMinutes).toBe(5);
      expect(response.body.data.scheduledAt).toBeDefined();
    });
  });
});
