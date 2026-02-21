import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock connection module before importing migrate
vi.mock('./connection', () => ({
  query: vi.fn(),
  pool: {
    connect: vi.fn().mockResolvedValue({
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      release: vi.fn(),
    }),
    end: vi.fn(),
  },
}));

import { query, pool } from './connection';
import { ensureMigrationsTable, getExecutedMigrations, recordMigration } from './migrate';

describe('Migration Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ensureMigrationsTable', () => {
    it('should create _migrations table if it does not exist', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      
      await ensureMigrationsTable();
      
      expect(query).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS _migrations'));
    });

    it('should be idempotent - safe to call multiple times', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      
      await ensureMigrationsTable();
      await ensureMigrationsTable();
      
      expect(query).toHaveBeenCalledTimes(2);
    });
  });

  describe('getExecutedMigrations', () => {
    it('should return list of executed migrations', async () => {
      const mockMigrations = [
        { name: '001_initial.sql', executed_at: new Date('2024-01-01') },
        { name: '002_add_users.sql', executed_at: new Date('2024-01-02') },
      ];
      
      vi.mocked(query).mockResolvedValueOnce({ rows: mockMigrations, rowCount: 2 } as any);
      
      const result = await getExecutedMigrations();
      
      expect(query).toHaveBeenCalledWith('SELECT name, executed_at FROM _migrations ORDER BY executed_at');
      expect(result).toEqual(mockMigrations);
    });

    it('should return empty array when no migrations have been executed', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      
      const result = await getExecutedMigrations();
      
      expect(result).toEqual([]);
    });
  });

  describe('recordMigration', () => {
    it('should insert migration record', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);
      
      await recordMigration('001_initial.sql');
      
      expect(query).toHaveBeenCalledWith(
        'INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        ['001_initial.sql']
      );
    });

    it('should handle duplicate records gracefully', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      
      // Should not throw on duplicate
      await expect(recordMigration('001_initial.sql')).resolves.not.toThrow();
    });
  });

  describe('Migration skipping', () => {
    it('should skip migrations that have already been executed', async () => {
      const executedMigrations = [
        { name: '001_initial.sql', executed_at: new Date() },
      ];
      
      vi.mocked(query).mockResolvedValueOnce({ rows: executedMigrations, rowCount: 1 } as any);
      
      const result = await getExecutedMigrations();
      const executedNames = new Set(result.map(m => m.name));
      
      expect(executedNames.has('001_initial.sql')).toBe(true);
      expect(executedNames.has('002_new_migration.sql')).toBe(false);
    });
  });
});
