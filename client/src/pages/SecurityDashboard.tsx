import { useEffect, useState } from 'react';
import {
  Shield,
  AlertTriangle,
  Lock,
  Unlock,
  Activity,
  Clock,
  UserX,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Server,
  RefreshCw,
  FileText,
} from 'lucide-react';
import api from '../services/api';
import type {
  AuditLog,
  SecurityStats,
  SecurityHeadersStatus,
  LockedAccount,
} from '../types';

interface SecurityDashboardData {
  recentLogs: AuditLog[];
  stats: SecurityStats;
  headers: SecurityHeadersStatus;
  lockedAccounts: LockedAccount[];
  rateLimitStatus: {
    auth: { max: number; windowMs: number };
    api: { max: number; windowMs: number };
  };
}

function StatusCard({
  icon: Icon,
  label,
  value,
  status,
  description,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  status: 'success' | 'warning' | 'error' | 'neutral';
  description?: string;
}) {
  const statusConfig = {
    success: {
      bg: 'bg-success/10',
      text: 'text-success',
      iconColor: 'text-success',
      border: 'border-success/20',
    },
    warning: {
      bg: 'bg-warning/10',
      text: 'text-warning',
      iconColor: 'text-warning',
      border: 'border-warning/20',
    },
    error: {
      bg: 'bg-error/10',
      text: 'text-error',
      iconColor: 'text-error',
      border: 'border-error/20',
    },
    neutral: {
      bg: 'bg-surface',
      text: 'text-text-muted',
      iconColor: 'text-text-muted',
      border: 'border-border',
    },
  };

  const config = statusConfig[status];

  return (
    <div
      className={`bg-surface-alt border ${config.border} rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-text-muted">{label}</p>
          <p className={`text-2xl font-bold ${config.text} mt-1 font-variant-numeric tabular-nums`}>
            {value}
          </p>
          {description && (
            <p className="text-xs text-text-muted mt-1">{description}</p>
          )}
        </div>
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bg}`}
        >
          <Icon className={`w-6 h-6 ${config.iconColor}`} />
        </div>
      </div>
    </div>
  );
}

function SecurityHeaderStatus({
  headers,
}: {
  headers: SecurityHeadersStatus;
}) {
  const items = [
    { key: 'contentSecurityPolicy', label: 'Content Security Policy', enabled: headers.contentSecurityPolicy },
    { key: 'hsts', label: 'HSTS (HTTPS Strict Transport)', enabled: headers.hsts },
    { key: 'frameguard', label: 'Frameguard (Clickjacking)', enabled: headers.frameguard },
    { key: 'noSniff', label: 'X-Content-Type-Options', enabled: headers.noSniff },
    { key: 'referrerPolicy', label: 'Referrer Policy', enabled: headers.referrerPolicy },
  ];

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.key} className="flex items-center justify-between py-2">
          <span className="text-sm text-text">{item.label}</span>
          <div className="flex items-center gap-2">
            {item.enabled ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span className="text-xs text-success font-medium">Active</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-error" />
                <span className="text-xs text-error font-medium">Inactive</span>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function AuditLogTable({ logs }: { logs: AuditLog[] }) {
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'LOGIN_SUCCESS':
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'LOGIN_FAILURE':
        return <XCircle className="w-4 h-4 text-error" />;
      case 'RATE_LIMIT_HIT':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'UNAUTHORIZED_ACCESS':
        return <Shield className="w-4 h-4 text-error" />;
      case 'PASSWORD_CHANGE':
        return <Lock className="w-4 h-4 text-primary-400" />;
      case 'LOGOUT':
        return <Unlock className="w-4 h-4 text-text-muted" />;
      default:
        return <Activity className="w-4 h-4 text-text-muted" />;
    }
  };

  const getEventLabel = (eventType: string) => {
    switch (eventType) {
      case 'LOGIN_SUCCESS':
        return 'Login Success';
      case 'LOGIN_FAILURE':
        return 'Login Failed';
      case 'RATE_LIMIT_HIT':
        return 'Rate Limit Hit';
      case 'UNAUTHORIZED_ACCESS':
        return 'Unauthorized Access';
      case 'PASSWORD_CHANGE':
        return 'Password Changed';
      case 'LOGOUT':
        return 'Logout';
      default:
        return eventType;
    }
  };

  const getRowClass = (eventType: string) => {
    switch (eventType) {
      case 'LOGIN_FAILURE':
      case 'UNAUTHORIZED_ACCESS':
        return 'bg-error/5';
      case 'RATE_LIMIT_HIT':
        return 'bg-warning/5';
      default:
        return '';
    }
  };

  if (logs.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="w-12 h-12 text-text-subtle mx-auto mb-3" />
        <p className="text-text-muted text-sm">No audit logs found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left text-xs font-medium text-text-muted uppercase py-3 px-4">
              Event
            </th>
            <th className="text-left text-xs font-medium text-text-muted uppercase py-3 px-4">
              User ID
            </th>
            <th className="text-left text-xs font-medium text-text-muted uppercase py-3 px-4">
              IP Address
            </th>
            <th className="text-left text-xs font-medium text-text-muted uppercase py-3 px-4">
              Time
            </th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr
              key={log.id}
              className={`border-b border-border-subtle last:border-0 hover:bg-surface/50 transition-colors ${getRowClass(
                log.event_type
              )}`}
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  {getEventIcon(log.event_type)}
                  <span className="text-sm text-text">{getEventLabel(log.event_type)}</span>
                </div>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-text-muted">
                  {log.user_id || '—'}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-text-muted font-mono">
                  {log.ip_address || '—'}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-text-muted">
                  {new Date(log.created_at).toLocaleString('tr-TR')}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LockedAccountsList({ accounts }: { accounts: LockedAccount[] }) {
  if (accounts.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
        <p className="text-text-muted text-sm">No locked accounts</p>
        <p className="text-xs text-text-subtle mt-1">All accounts are accessible</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {accounts.map((account) => (
        <div
          key={account.id}
          className="flex items-center justify-between py-3 border-b border-border-subtle last:border-0"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-error/10 flex items-center justify-center">
              <UserX className="w-4 h-4 text-error" />
            </div>
            <div>
              <span className="text-sm text-text block">{account.email}</span>
              <span className="text-xs text-text-muted">
                {account.failed_login_attempts} failed attempts
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-error font-medium block">Locked</span>
            <span className="text-xs text-text-muted">
              Until {new Date(account.locked_until).toLocaleTimeString('tr-TR')}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SecurityDashboard() {
  const [data, setData] = useState<SecurityDashboardData>({
    recentLogs: [],
    stats: {
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
    headers: {
      contentSecurityPolicy: true,
      hsts: true,
      frameguard: true,
      noSniff: true,
      referrerPolicy: true,
      allEnabled: true,
    },
    lockedAccounts: [],
    rateLimitStatus: {
      auth: { max: 5, windowMs: 900000 },
      api: { max: 100, windowMs: 900000 },
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSecurityData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [logsRes, statsRes, headersRes, lockedRes] = await Promise.all([
        api.get('/security/audit-logs?limit=20').catch(() => ({ data: { logs: [], total: 0 } })),
        api.get('/security/stats').catch(() => ({
          data: {
            totalEvents: 0,
            eventsByType: {},
            uniqueIps: 0,
            uniqueUsers: 0,
          },
        })),
        api.get('/security/headers').catch(() => ({
          data: {
            contentSecurityPolicy: true,
            hsts: true,
            frameguard: true,
            noSniff: true,
            referrerPolicy: true,
            allEnabled: true,
          },
        })),
        api.get('/security/locked-accounts').catch(() => ({ data: [] })),
      ]);

      setData({
        recentLogs: logsRes.data.logs || [],
        stats: {
          totalEvents: statsRes.data.totalEvents || 0,
          eventsByType: {
            LOGIN_SUCCESS: 0,
            LOGIN_FAILURE: 0,
            LOGOUT: 0,
            PASSWORD_CHANGE: 0,
            UNAUTHORIZED_ACCESS: 0,
            RATE_LIMIT_HIT: 0,
            ...statsRes.data.eventsByType,
          },
          uniqueIps: statsRes.data.uniqueIps || 0,
          uniqueUsers: statsRes.data.uniqueUsers || 0,
        },
        headers: headersRes.data,
        lockedAccounts: lockedRes.data || [],
        rateLimitStatus: {
          auth: { max: 5, windowMs: 900000 },
          api: { max: 100, windowMs: 900000 },
        },
      });
    } catch (err) {
      setError('Failed to load security data');
      console.error('Failed to fetch security data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const failedLogins = data.stats.eventsByType.LOGIN_FAILURE || 0;
  const rateLimitHits = data.stats.eventsByType.RATE_LIMIT_HIT || 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 bg-surface-elevated rounded animate-pulse" />
          <div className="h-4 w-64 bg-surface-elevated rounded mt-2 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-surface-elevated rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-80 bg-surface-elevated rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Security Dashboard</h1>
          <p className="text-text-muted mt-1">Security metrics and audit logs</p>
        </div>
        <div className="bg-error/10 border border-error/20 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-error mx-auto mb-3" />
          <p className="text-error font-medium">{error}</p>
          <button
            onClick={fetchSecurityData}
            className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Security Dashboard</h1>
          <p className="text-text-muted mt-1">Security metrics and audit logs</p>
        </div>
        <button
          onClick={fetchSecurityData}
          className="flex items-center gap-2 px-4 py-2 bg-surface-alt border border-border rounded-lg text-text-muted hover:text-text hover:bg-surface-elevated transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-400"
          aria-label="Refresh security data"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="text-sm">Refresh</span>
        </button>
      </div>

      {/* Security Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          icon={Shield}
          label="Security Headers"
          value={data.headers.allEnabled ? 'Active' : 'Issues'}
          status={data.headers.allEnabled ? 'success' : 'warning'}
          description="All security headers enabled"
        />
        <StatusCard
          icon={Clock}
          label="Rate Limiting"
          value={`${data.rateLimitStatus.auth.max}/15min`}
          status="success"
          description="Auth endpoint protection"
        />
        <StatusCard
          icon={AlertTriangle}
          label="Failed Logins"
          value={failedLogins}
          status={failedLogins > 10 ? 'error' : failedLogins > 0 ? 'warning' : 'success'}
          description="Last 24 hours"
        />
        <StatusCard
          icon={Lock}
          label="Locked Accounts"
          value={data.lockedAccounts.length}
          status={data.lockedAccounts.length > 0 ? 'error' : 'success'}
          description="Currently locked out"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Audit Logs */}
        <div className="lg:col-span-2 bg-surface-alt border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-400" />
              Recent Audit Logs
            </h2>
            <span className="text-xs text-text-muted">
              {data.stats.totalEvents} total events
            </span>
          </div>
          <AuditLogTable logs={data.recentLogs} />
        </div>

        {/* Security Status Panel */}
        <div className="space-y-6">
          {/* Security Headers */}
          <div className="bg-surface-alt border border-border rounded-xl p-5">
            <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
              <Server className="w-5 h-5 text-primary-400" />
              Security Headers
            </h2>
            <SecurityHeaderStatus headers={data.headers} />
          </div>

          {/* Locked Accounts */}
          <div className="bg-surface-alt border border-border rounded-xl p-5">
            <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
              <UserX className="w-5 h-5 text-error" />
              Locked Accounts
            </h2>
            <LockedAccountsList accounts={data.lockedAccounts} />
          </div>

          {/* Rate Limit Stats */}
          <div className="bg-surface-alt border border-border rounded-xl p-5">
            <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-accent-400" />
              Rate Limit Stats
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-text">Auth Endpoint</span>
                <span className="text-sm text-text-muted">
                  {data.rateLimitStatus.auth.max} req / 15 min
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-text">API Endpoint</span>
                <span className="text-sm text-muted">
                  {data.rateLimitStatus.api.max} req / 15 min
                </span>
              </div>
              {rateLimitHits > 0 && (
                <div className="flex items-center justify-between py-2 bg-warning/10 rounded-lg px-3">
                  <span className="text-sm text-warning">Rate Limit Hits (24h)</span>
                  <span className="text-sm font-bold text-warning">{rateLimitHits}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
