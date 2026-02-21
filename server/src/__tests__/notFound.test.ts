import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';

// Create a minimal app for testing 404 handling
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Existing route
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // API 404 handler
  app.use('/api/*', (_req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'API endpoint not found',
        details: [],
      },
    });
  });

  return app;
};

describe('API 404 Handling', () => {
  const app = createTestApp();

  describe('GET /api/non-existent', () => {
    it('returns 404 status code', async () => {
      const response = await request(app).get('/api/non-existent');
      expect(response.status).toBe(404);
    });

    it('returns JSON content type', async () => {
      const response = await request(app).get('/api/non-existent');
      expect(response.headers['content-type']).toContain('application/json');
    });

    it('returns proper error structure', async () => {
      const response = await request(app).get('/api/non-existent');
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
      expect(response.body.error).toHaveProperty('message', 'API endpoint not found');
      expect(response.body.error).toHaveProperty('details');
      expect(Array.isArray(response.body.error.details)).toBe(true);
    });
  });

  describe('POST /api/invalid-endpoint', () => {
    it('returns 404 for POST requests', async () => {
      const response = await request(app)
        .post('/api/invalid-endpoint')
        .send({ test: 'data' });
      
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/missing-resource', () => {
    it('returns 404 for PUT requests', async () => {
      const response = await request(app)
        .put('/api/missing-resource')
        .send({ test: 'data' });
      
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/unknown', () => {
    it('returns 404 for DELETE requests', async () => {
      const response = await request(app).delete('/api/unknown');
      
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PATCH /api/not-found', () => {
    it('returns 404 for PATCH requests', async () => {
      const response = await request(app)
        .patch('/api/not-found')
        .send({ test: 'data' });
      
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Existing routes still work', () => {
    it('/api/health returns 200', async () => {
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
    });
  });
});
