import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import helmet from 'helmet';
import { securityHeaders } from '../src/middleware/securityHeaders';

describe('Security Headers Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(securityHeaders);
    app.get('/test', (_req, res) => {
      res.json({ success: true });
    });
  });

  it('should set X-Content-Type-Options header to nosniff', async () => {
    const res = await request(app).get('/test');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('should set X-Frame-Options header to DENY', async () => {
    const res = await request(app).get('/test');
    expect(res.headers['x-frame-options']).toBe('DENY');
  });

  it('should set Strict-Transport-Security header with max-age of 31536000', async () => {
    const res = await request(app).get('/test');
    expect(res.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains; preload');
  });

  it('should remove X-Powered-By header', async () => {
    const res = await request(app).get('/test');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('should set Content-Security-Policy header', async () => {
    const res = await request(app).get('/test');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
  });

  it('should set Referrer-Policy header', async () => {
    const res = await request(app).get('/test');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  it('should set all required security headers in a single request', async () => {
    const res = await request(app).get('/test');
    
    // Check all acceptance criteria
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains; preload');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['content-security-policy']).toBeDefined();
  });
});
