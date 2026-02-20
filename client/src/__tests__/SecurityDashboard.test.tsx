import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SecurityDashboard from '../pages/SecurityDashboard';
import api from '../services/api';

// Mock the API
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockApi = api as unknown as { get: ReturnType<typeof vi.fn> };

describe('SecurityDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockApi.get.mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <SecurityDashboard />
      </MemoryRouter>
    );

    // Loading state shows skeleton/pulse elements
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('displays security stats after loading', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url.includes('/security/audit-logs')) {
        return Promise.resolve({
          data: {
            logs: [
              {
                id: 1,
                event_type: 'LOGIN_SUCCESS',
                user_id: 1,
                ip_address: '192.168.1.1',
                user_agent: 'Mozilla/5.0',
                details: null,
                created_at: new Date().toISOString(),
              },
            ],
            total: 1,
          },
        });
      }
      if (url.includes('/security/stats')) {
        return Promise.resolve({
          data: {
            totalEvents: 10,
            eventsByType: {
              LOGIN_SUCCESS: 5,
              LOGIN_FAILURE: 2,
              LOGOUT: 2,
              PASSWORD_CHANGE: 1,
              UNAUTHORIZED_ACCESS: 0,
              RATE_LIMIT_HIT: 0,
            },
            uniqueIps: 3,
            uniqueUsers: 2,
          },
        });
      }
      if (url.includes('/security/headers')) {
        return Promise.resolve({
          data: {
            contentSecurityPolicy: true,
            hsts: true,
            frameguard: true,
            noSniff: true,
            referrerPolicy: true,
            allEnabled: true,
          },
        });
      }
      if (url.includes('/security/locked-accounts')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter>
        <SecurityDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Security Dashboard' })).toBeInTheDocument();
    });

    expect(screen.getByText('Security Headers')).toBeInTheDocument();
    expect(screen.getByText('Rate Limiting')).toBeInTheDocument();
  });

  it('displays audit logs in table format', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url.includes('/security/audit-logs')) {
        return Promise.resolve({
          data: {
            logs: [
              {
                id: 1,
                event_type: 'LOGIN_SUCCESS',
                user_id: 1,
                ip_address: '192.168.1.1',
                user_agent: 'Mozilla/5.0',
                details: null,
                created_at: new Date().toISOString(),
              },
              {
                id: 2,
                event_type: 'LOGIN_FAILURE',
                user_id: null,
                ip_address: '192.168.1.2',
                user_agent: 'Mozilla/5.0',
                details: { reason: 'Invalid password' },
                created_at: new Date().toISOString(),
              },
            ],
            total: 2,
          },
        });
      }
      if (url.includes('/security/stats')) {
        return Promise.resolve({
          data: {
            totalEvents: 2,
            eventsByType: {
              LOGIN_SUCCESS: 1,
              LOGIN_FAILURE: 1,
              LOGOUT: 0,
              PASSWORD_CHANGE: 0,
              UNAUTHORIZED_ACCESS: 0,
              RATE_LIMIT_HIT: 0,
            },
            uniqueIps: 2,
            uniqueUsers: 1,
          },
        });
      }
      if (url.includes('/security/headers')) {
        return Promise.resolve({
          data: {
            contentSecurityPolicy: true,
            hsts: true,
            frameguard: true,
            noSniff: true,
            referrerPolicy: true,
            allEnabled: true,
          },
        });
      }
      if (url.includes('/security/locked-accounts')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter>
        <SecurityDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Recent Audit Logs' })).toBeInTheDocument();
    });

    expect(screen.getByText('Login Success')).toBeInTheDocument();
    expect(screen.getByText('Login Failed')).toBeInTheDocument();
  });

  it('highlights failed login attempts in red', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url.includes('/security/audit-logs')) {
        return Promise.resolve({
          data: {
            logs: [
              {
                id: 2,
                event_type: 'LOGIN_FAILURE',
                user_id: null,
                ip_address: '192.168.1.2',
                user_agent: 'Mozilla/5.0',
                details: { reason: 'Invalid password' },
                created_at: new Date().toISOString(),
              },
            ],
            total: 1,
          },
        });
      }
      if (url.includes('/security/stats')) {
        return Promise.resolve({
          data: {
            totalEvents: 1,
            eventsByType: {
              LOGIN_SUCCESS: 0,
              LOGIN_FAILURE: 1,
              LOGOUT: 0,
              PASSWORD_CHANGE: 0,
              UNAUTHORIZED_ACCESS: 0,
              RATE_LIMIT_HIT: 0,
            },
            uniqueIps: 1,
            uniqueUsers: 0,
          },
        });
      }
      if (url.includes('/security/headers')) {
        return Promise.resolve({
          data: {
            contentSecurityPolicy: true,
            hsts: true,
            frameguard: true,
            noSniff: true,
            referrerPolicy: true,
            allEnabled: true,
          },
        });
      }
      if (url.includes('/security/locked-accounts')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter>
        <SecurityDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Login Failed')).toBeInTheDocument();
    });

    // The failed login row should have error styling (bg-error/5)
    const failedLoginRow = screen.getByText('Login Failed').closest('tr');
    expect(failedLoginRow).toHaveClass('bg-error/5');
  });

  it('displays locked accounts section', async () => {
    const lockedUntil = new Date();
    lockedUntil.setHours(lockedUntil.getHours() + 1);

    mockApi.get.mockImplementation((url: string) => {
      if (url.includes('/security/audit-logs')) {
        return Promise.resolve({
          data: { logs: [], total: 0 },
        });
      }
      if (url.includes('/security/stats')) {
        return Promise.resolve({
          data: {
            totalEvents: 0,
            eventsByType: {
              LOGIN_SUCCESS: 0,
              LOGIN_FAILURE: 0,
              LOGOUT: 0,
              PASSWORD_CHANGE: 0,
              UNAUTHORIZED_ACCESS: 0,
              RATE_LIMIT_HIT: 0,
            },
            uniqueIps: 0,
            uniqueUsers: 0,
          },
        });
      }
      if (url.includes('/security/headers')) {
        return Promise.resolve({
          data: {
            contentSecurityPolicy: true,
            hsts: true,
            frameguard: true,
            noSniff: true,
            referrerPolicy: true,
            allEnabled: true,
          },
        });
      }
      if (url.includes('/security/locked-accounts')) {
        return Promise.resolve({
          data: [
            {
              id: 1,
              email: 'test@example.com',
              failed_login_attempts: 5,
              locked_until: lockedUntil.toISOString(),
            },
          ],
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter>
        <SecurityDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /locked accounts/i })).toBeInTheDocument();
    });

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('5 failed attempts')).toBeInTheDocument();
  });

  it('displays security status indicators', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url.includes('/security/audit-logs')) {
        return Promise.resolve({
          data: { logs: [], total: 0 },
        });
      }
      if (url.includes('/security/stats')) {
        return Promise.resolve({
          data: {
            totalEvents: 0,
            eventsByType: {
              LOGIN_SUCCESS: 0,
              LOGIN_FAILURE: 0,
              LOGOUT: 0,
              PASSWORD_CHANGE: 0,
              UNAUTHORIZED_ACCESS: 0,
              RATE_LIMIT_HIT: 0,
            },
            uniqueIps: 0,
            uniqueUsers: 0,
          },
        });
      }
      if (url.includes('/security/headers')) {
        return Promise.resolve({
          data: {
            contentSecurityPolicy: true,
            hsts: true,
            frameguard: true,
            noSniff: true,
            referrerPolicy: true,
            allEnabled: true,
          },
        });
      }
      if (url.includes('/security/locked-accounts')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter>
        <SecurityDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Content Security Policy')).toBeInTheDocument();
    });

    // Check security headers status
    expect(screen.getByText('HSTS (HTTPS Strict Transport)')).toBeInTheDocument();
    expect(screen.getByText('Frameguard (Clickjacking)')).toBeInTheDocument();
    expect(screen.getByText('X-Content-Type-Options')).toBeInTheDocument();
    expect(screen.getByText('Referrer Policy')).toBeInTheDocument();

    // All should show as Active
    const activeIndicators = screen.getAllByText('Active');
    expect(activeIndicators.length).toBeGreaterThanOrEqual(5);
  });

  it('refreshes data when refresh button is clicked', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url.includes('/security/audit-logs')) {
        return Promise.resolve({
          data: { logs: [], total: 0 },
        });
      }
      if (url.includes('/security/stats')) {
        return Promise.resolve({
          data: {
            totalEvents: 0,
            eventsByType: {
              LOGIN_SUCCESS: 0,
              LOGIN_FAILURE: 0,
              LOGOUT: 0,
              PASSWORD_CHANGE: 0,
              UNAUTHORIZED_ACCESS: 0,
              RATE_LIMIT_HIT: 0,
            },
            uniqueIps: 0,
            uniqueUsers: 0,
          },
        });
      }
      if (url.includes('/security/headers')) {
        return Promise.resolve({
          data: {
            contentSecurityPolicy: true,
            hsts: true,
            frameguard: true,
            noSniff: true,
            referrerPolicy: true,
            allEnabled: true,
          },
        });
      }
      if (url.includes('/security/locked-accounts')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter>
        <SecurityDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Refresh security data')).toBeInTheDocument();
    });

    // Click refresh button
    fireEvent.click(screen.getByLabelText('Refresh security data'));

    // Should make API calls again
    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledTimes(8); // 4 initial + 4 after refresh
    });
  });

  it('displays empty state when no audit logs', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url.includes('/security/audit-logs')) {
        return Promise.resolve({
          data: { logs: [], total: 0 },
        });
      }
      if (url.includes('/security/stats')) {
        return Promise.resolve({
          data: {
            totalEvents: 0,
            eventsByType: {
              LOGIN_SUCCESS: 0,
              LOGIN_FAILURE: 0,
              LOGOUT: 0,
              PASSWORD_CHANGE: 0,
              UNAUTHORIZED_ACCESS: 0,
              RATE_LIMIT_HIT: 0,
            },
            uniqueIps: 0,
            uniqueUsers: 0,
          },
        });
      }
      if (url.includes('/security/headers')) {
        return Promise.resolve({
          data: {
            contentSecurityPolicy: true,
            hsts: true,
            frameguard: true,
            noSniff: true,
            referrerPolicy: true,
            allEnabled: true,
          },
        });
      }
      if (url.includes('/security/locked-accounts')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter>
        <SecurityDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No audit logs found')).toBeInTheDocument();
    });
  });

  it('displays empty state when no locked accounts', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url.includes('/security/audit-logs')) {
        return Promise.resolve({
          data: { logs: [], total: 0 },
        });
      }
      if (url.includes('/security/stats')) {
        return Promise.resolve({
          data: {
            totalEvents: 0,
            eventsByType: {
              LOGIN_SUCCESS: 0,
              LOGIN_FAILURE: 0,
              LOGOUT: 0,
              PASSWORD_CHANGE: 0,
              UNAUTHORIZED_ACCESS: 0,
              RATE_LIMIT_HIT: 0,
            },
            uniqueIps: 0,
            uniqueUsers: 0,
          },
        });
      }
      if (url.includes('/security/headers')) {
        return Promise.resolve({
          data: {
            contentSecurityPolicy: true,
            hsts: true,
            frameguard: true,
            noSniff: true,
            referrerPolicy: true,
            allEnabled: true,
          },
        });
      }
      if (url.includes('/security/locked-accounts')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter>
        <SecurityDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No locked accounts')).toBeInTheDocument();
    });

    expect(screen.getByText('All accounts are accessible')).toBeInTheDocument();
  });
});
