import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { securityHeaders } from './middleware/securityHeaders';

describe('Security Headers Middleware', () => {
  it('should set security headers', async () => {
    const app = express();
    app.use(securityHeaders);
    app.get('/test', (_req, res) => res.json({ message: 'ok' }));

    const response = await request(app).get('/test');

    expect(response.status).toBe(200);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
  });
});
