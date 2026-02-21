import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from './middleware/errorHandler';

describe('API 404 Handling', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Existing route
    app.get('/api/health', (_req, res) => {
      res.json({ status: 'ok' });
    });

    // API 404 handler
    app.use('/api/*', (_req, res) => {
      res.status(404).json({
        error: 'Endpoint bulunamadi',
        message: 'Istenen API endpointi mevcut degil',
        path: _req.originalUrl,
        timestamp: new Date().toISOString(),
      });
    });

    app.use(errorHandler);
  });

  it('returns 404 for non-existent API endpoints', async () => {
    const response = await request(app)
      .get('/api/nonexistent')
      .expect(404);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Endpoint bulunamadi');
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('path');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('returns 404 for non-existent nested API endpoints', async () => {
    const response = await request(app)
      .post('/api/sites/999/articles')
      .expect(404);

    expect(response.body.error).toBe('Endpoint bulunamadi');
    expect(response.body.path).toBe('/api/sites/999/articles');
  });

  it('returns 404 for API endpoints with query params', async () => {
    const response = await request(app)
      .get('/api/unknown?param=value')
      .expect(404);

    expect(response.body.error).toBe('Endpoint bulunamadi');
  });

  it('returns JSON content type for 404 responses', async () => {
    const response = await request(app)
      .get('/api/missing')
      .expect(404);

    expect(response.headers['content-type']).toMatch(/application\/json/);
  });

  it('still serves existing API endpoints', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
  });

  it('returns 404 for different HTTP methods on non-existent endpoints', async () => {
    const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;
    
    for (const method of methods) {
      const response = await request(app)[method]('/api/not-found').expect(404);
      expect(response.body.error).toBe('Endpoint bulunamadi');
    }
  });
});
