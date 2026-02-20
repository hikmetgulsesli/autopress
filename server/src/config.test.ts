import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Config Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv };
    // Clear module cache to re-import config
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('JWT_SECRET validation', () => {
    it('should exit if JWT_SECRET is missing', async () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`Process.exit called with code ${code}`);
      });

      // Clear all env vars that might be set
      process.env.JWT_SECRET = '';
      process.env.JWT_REFRESH_SECRET = 'valid-refresh-secret-min-32-chars';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      process.env.CORS_ORIGIN = 'http://localhost:3519';

      await expect(import('./config')).rejects.toThrow('Process.exit called with code 1');
      mockExit.mockRestore();
    });

    it('should exit if JWT_SECRET is less than 32 characters', async () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`Process.exit called with code ${code}`);
      });

      process.env.JWT_SECRET = 'short-secret';
      process.env.JWT_REFRESH_SECRET = 'valid-refresh-secret-min-32-chars';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      process.env.CORS_ORIGIN = 'http://localhost:3519';

      await expect(import('./config')).rejects.toThrow('Process.exit called with code 1');
      mockExit.mockRestore();
    });

    it('should accept JWT_SECRET with 32 or more characters', async () => {
      process.env.JWT_SECRET = 'this-is-a-valid-secret-with-32-chars!';
      process.env.JWT_REFRESH_SECRET = 'valid-refresh-secret-min-32-chars';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      process.env.CORS_ORIGIN = 'http://localhost:3519';

      const { config } = await import('./config');
      expect(config.JWT_SECRET).toBe('this-is-a-valid-secret-with-32-chars!');
    });
  });

  describe('JWT_REFRESH_SECRET validation', () => {
    it('should exit if JWT_REFRESH_SECRET is missing', async () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`Process.exit called with code ${code}`);
      });

      process.env.JWT_SECRET = 'this-is-a-valid-secret-with-32-chars!';
      process.env.JWT_REFRESH_SECRET = '';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      process.env.CORS_ORIGIN = 'http://localhost:3519';

      await expect(import('./config')).rejects.toThrow('Process.exit called with code 1');
      mockExit.mockRestore();
    });

    it('should accept JWT_REFRESH_SECRET when provided', async () => {
      process.env.JWT_SECRET = 'this-is-a-valid-secret-with-32-chars!';
      process.env.JWT_REFRESH_SECRET = 'valid-refresh-secret-min-32-chars';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      process.env.CORS_ORIGIN = 'http://localhost:3519';

      const { config } = await import('./config');
      expect(config.JWT_REFRESH_SECRET).toBe('valid-refresh-secret-min-32-chars');
    });
  });

  describe('DATABASE_URL validation', () => {
    it('should exit if DATABASE_URL is missing', async () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`Process.exit called with code ${code}`);
      });

      process.env.JWT_SECRET = 'this-is-a-valid-secret-with-32-chars!';
      process.env.JWT_REFRESH_SECRET = 'valid-refresh-secret-min-32-chars';
      process.env.DATABASE_URL = '';
      process.env.CORS_ORIGIN = 'http://localhost:3519';

      await expect(import('./config')).rejects.toThrow('Process.exit called with code 1');
      mockExit.mockRestore();
    });

    it('should exit if DATABASE_URL does not start with postgresql://', async () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`Process.exit called with code ${code}`);
      });

      process.env.JWT_SECRET = 'this-is-a-valid-secret-with-32-chars!';
      process.env.JWT_REFRESH_SECRET = 'valid-refresh-secret-min-32-chars';
      process.env.DATABASE_URL = 'mysql://user:pass@localhost/db';
      process.env.CORS_ORIGIN = 'http://localhost:3519';

      await expect(import('./config')).rejects.toThrow('Process.exit called with code 1');
      mockExit.mockRestore();
    });

    it('should accept DATABASE_URL starting with postgresql://', async () => {
      process.env.JWT_SECRET = 'this-is-a-valid-secret-with-32-chars!';
      process.env.JWT_REFRESH_SECRET = 'valid-refresh-secret-min-32-chars';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      process.env.CORS_ORIGIN = 'http://localhost:3519';

      const { config } = await import('./config');
      expect(config.DATABASE_URL).toBe('postgresql://user:pass@localhost/db');
    });

    it('should accept DATABASE_URL starting with postgres://', async () => {
      process.env.JWT_SECRET = 'this-is-a-valid-secret-with-32-chars!';
      process.env.JWT_REFRESH_SECRET = 'valid-refresh-secret-min-32-chars';
      process.env.DATABASE_URL = 'postgres://user:pass@localhost/db';
      process.env.CORS_ORIGIN = 'http://localhost:3519';

      const { config } = await import('./config');
      expect(config.DATABASE_URL).toBe('postgres://user:pass@localhost/db');
    });
  });

  describe('CORS_ORIGIN validation', () => {
    it('should use default if CORS_ORIGIN is missing', async () => {
      process.env.JWT_SECRET = 'this-is-a-valid-secret-with-32-chars!';
      process.env.JWT_REFRESH_SECRET = 'valid-refresh-secret-min-32-chars';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      process.env.CORS_ORIGIN = '';

      // CORS_ORIGIN has a default value, so it should not exit
      const { config } = await import('./config');
      expect(config.CORS_ORIGIN).toBe('http://localhost:3519');
    });

    it('should accept custom CORS_ORIGIN', async () => {
      process.env.JWT_SECRET = 'this-is-a-valid-secret-with-32-chars!';
      process.env.JWT_REFRESH_SECRET = 'valid-refresh-secret-min-32-chars';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      process.env.CORS_ORIGIN = 'https://example.com';

      const { config } = await import('./config');
      expect(config.CORS_ORIGIN).toBe('https://example.com');
    });
  });

  describe('PORT validation', () => {
    it('should default to 4519 if PORT is not set', async () => {
      process.env.JWT_SECRET = 'this-is-a-valid-secret-with-32-chars!';
      process.env.JWT_REFRESH_SECRET = 'valid-refresh-secret-min-32-chars';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      process.env.CORS_ORIGIN = 'http://localhost:3519';
      process.env.PORT = '';

      const { config } = await import('./config');
      expect(config.PORT).toBe(4519);
    });

    it('should parse PORT as number', async () => {
      process.env.JWT_SECRET = 'this-is-a-valid-secret-with-32-chars!';
      process.env.JWT_REFRESH_SECRET = 'valid-refresh-secret-min-32-chars';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      process.env.CORS_ORIGIN = 'http://localhost:3519';
      process.env.PORT = '3000';

      const { config } = await import('./config');
      expect(config.PORT).toBe(3000);
    });
  });

  describe('OPENAI_API_KEY validation', () => {
    it('should be optional', async () => {
      process.env.JWT_SECRET = 'this-is-a-valid-secret-with-32-chars!';
      process.env.JWT_REFRESH_SECRET = 'valid-refresh-secret-min-32-chars';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      process.env.CORS_ORIGIN = 'http://localhost:3519';
      process.env.OPENAI_API_KEY = '';

      const { config } = await import('./config');
      expect(config.OPENAI_API_KEY).toBeUndefined();
    });

    it('should exit if OPENAI_API_KEY does not start with sk-', async () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`Process.exit called with code ${code}`);
      });

      process.env.JWT_SECRET = 'this-is-a-valid-secret-with-32-chars!';
      process.env.JWT_REFRESH_SECRET = 'valid-refresh-secret-min-32-chars';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      process.env.CORS_ORIGIN = 'http://localhost:3519';
      process.env.OPENAI_API_KEY = 'invalid-key';

      await expect(import('./config')).rejects.toThrow('Process.exit called with code 1');
      mockExit.mockRestore();
    });

    it('should accept valid OPENAI_API_KEY starting with sk-', async () => {
      process.env.JWT_SECRET = 'this-is-a-valid-secret-with-32-chars!';
      process.env.JWT_REFRESH_SECRET = 'valid-refresh-secret-min-32-chars';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      process.env.CORS_ORIGIN = 'http://localhost:3519';
      process.env.OPENAI_API_KEY = 'sk-validopenaikey123456789';

      const { config } = await import('./config');
      expect(config.OPENAI_API_KEY).toBe('sk-validopenaikey123456789');
    });
  });
});

describe('Password Policy Constants', () => {
  it('should have correct password policy constants', async () => {
    process.env.JWT_SECRET = 'this-is-a-valid-secret-with-32-chars!';
    process.env.JWT_REFRESH_SECRET = 'valid-refresh-secret-min-32-chars';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
    process.env.CORS_ORIGIN = 'http://localhost:3519';

    const { PASSWORD_POLICY, PASSWORD_REGEX } = await import('./config');
    
    expect(PASSWORD_POLICY.MIN_LENGTH).toBe(12);
    expect(PASSWORD_POLICY.REQUIRE_UPPERCASE).toBe(true);
    expect(PASSWORD_POLICY.REQUIRE_LOWERCASE).toBe(true);
    expect(PASSWORD_POLICY.REQUIRE_NUMBER).toBe(true);
    expect(PASSWORD_POLICY.REQUIRE_SPECIAL_CHAR).toBe(true);
    
    // Test regex
    expect(PASSWORD_REGEX.test('Short1!')).toBe(false); // too short
    expect(PASSWORD_REGEX.test('lowercase123!')).toBe(false); // no uppercase
    expect(PASSWORD_REGEX.test('UPPERCASE123!')).toBe(false); // no lowercase
    expect(PASSWORD_REGEX.test('Password!@#')).toBe(false); // no number
    expect(PASSWORD_REGEX.test('Password123')).toBe(false); // no special char
    expect(PASSWORD_REGEX.test('Password123!')).toBe(true); // valid
    expect(PASSWORD_REGEX.test('MyStr0ng!Pass')).toBe(true); // valid
  });
});
