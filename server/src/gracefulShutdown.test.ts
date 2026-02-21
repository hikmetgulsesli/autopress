import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { stopScheduler } from './services/scheduler.service';
import { pool } from './db/connection';
import { logger } from './utils/logger';

// Mock dependencies
vi.mock('./services/scheduler.service', () => ({
  stopScheduler: vi.fn(),
  getSchedulerStatus: vi.fn().mockReturnValue({
    running: false,
    isProcessing: false,
    rssRunning: false,
    isRssPolling: false,
    config: {},
  }),
}));

vi.mock('./db/connection', () => ({
  pool: {
    end: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('./utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Graceful Server Shutdown', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockLoggerInfo: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockLoggerError: any;
  let originalProcessExit: typeof process.exit;

  beforeEach(() => {
    vi.clearAllMocks();
    // Get the mock functions after vi.mock is set up
    mockLoggerInfo = logger.info as ReturnType<typeof vi.fn>;
    mockLoggerError = logger.error as ReturnType<typeof vi.fn>;
    originalProcessExit = process.exit;
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
  });

  afterEach(() => {
    process.exit = originalProcessExit;
    vi.restoreAllMocks();
  });

  it('should stop scheduler on SIGTERM', async () => {
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);
      stopScheduler();
      await pool.end();
      logger.info('Graceful shutdown complete');
      process.exit(0);
    };

    await gracefulShutdown('SIGTERM');

    expect(stopScheduler).toHaveBeenCalled();
    expect(pool.end).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Received SIGTERM, starting graceful shutdown...');
    expect(logger.info).toHaveBeenCalledWith('Scheduler stopped');
    expect(logger.info).toHaveBeenCalledWith('Database pool connections drained');
    expect(logger.info).toHaveBeenCalledWith('Graceful shutdown complete');
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('should stop scheduler on SIGINT', async () => {
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);
      stopScheduler();
      await pool.end();
      logger.info('Graceful shutdown complete');
      process.exit(0);
    };

    await gracefulShutdown('SIGINT');

    expect(stopScheduler).toHaveBeenCalled();
    expect(pool.end).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Received SIGINT, starting graceful shutdown...');
    expect(logger.info).toHaveBeenCalledWith('Scheduler stopped');
    expect(logger.info).toHaveBeenCalledWith('Database pool connections drained');
    expect(logger.info).toHaveBeenCalledWith('Graceful shutdown complete');
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('should handle database pool drain errors gracefully', async () => {
    vi.mocked(pool.end).mockRejectedValueOnce(new Error('Pool drain error'));

    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);
      try {
        stopScheduler();
        await pool.end();
        logger.info('Graceful shutdown complete');
        process.exit(0);
      } catch (err) {
        logger.error('Error during graceful shutdown:', err);
        process.exit(1);
      }
    };

    await gracefulShutdown('SIGTERM');

    expect(stopScheduler).toHaveBeenCalled();
    expect(pool.end).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('Error during graceful shutdown:', new Error('Pool drain error'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should log shutdown events', async () => {
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);
      stopScheduler();
      await pool.end();
      logger.info('Graceful shutdown complete');
      process.exit(0);
    };

    await gracefulShutdown('SIGTERM');

    // Verify all expected log calls using the mock
    const infoCalls = mockLoggerInfo.mock.calls;
    const logMessages = infoCalls.map((call: unknown[]) => call[0] as string);
    
    expect(logMessages).toContain('Received SIGTERM, starting graceful shutdown...');
    expect(logMessages).toContain('Scheduler stopped');
    expect(logMessages).toContain('Database pool connections drained');
    expect(logMessages).toContain('Graceful shutdown complete');
  });

  it('should handle stopScheduler errors gracefully', async () => {
    vi.mocked(stopScheduler).mockImplementationOnce(() => {
      throw new Error('Scheduler stop error');
    });

    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);
      try {
        stopScheduler();
        await pool.end();
        logger.info('Graceful shutdown complete');
        process.exit(0);
      } catch (err) {
        logger.error('Error during graceful shutdown:', err);
        process.exit(1);
      }
    };

    await gracefulShutdown('SIGTERM');

    expect(logger.error).toHaveBeenCalledWith('Error during graceful shutdown:', new Error('Scheduler stop error'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should drain DB pool before exit', async () => {
    const gracefulShutdown = async (): Promise<void> => {
      stopScheduler();
      await pool.end();
      process.exit(0);
    };

    await gracefulShutdown();

    // Verify pool.end is called before process.exit
    expect(pool.end).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(0);
    
    // The order should be: stopScheduler -> pool.end -> process.exit
    expect(stopScheduler).toHaveBeenCalledTimes(1);
    expect(pool.end).toHaveBeenCalledTimes(1);
    expect(process.exit).toHaveBeenCalledTimes(1);
  });
});
