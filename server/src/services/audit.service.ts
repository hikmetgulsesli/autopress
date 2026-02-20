import { query } from '../db/connection';

export type SecurityEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGOUT'
  | 'PASSWORD_CHANGE'
  | 'UNAUTHORIZED_ACCESS'
  | 'RATE_LIMIT_HIT';

export interface SecurityEventDetails {
  reason?: string;
  [key: string]: unknown;
}

export interface LogSecurityEventParams {
  eventType: SecurityEventType;
  userId?: number | null;
  ipAddress?: string;
  userAgent?: string;
  details?: SecurityEventDetails;
}

/**
 * Log a security-relevant event to the audit_logs table.
 * Used for monitoring and compliance.
 */
export async function logSecurityEvent({
  eventType,
  userId = null,
  ipAddress,
  userAgent,
  details,
}: LogSecurityEventParams): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_logs (event_type, user_id, ip_address, user_agent, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [eventType, userId, ipAddress || null, userAgent || null, details ? JSON.stringify(details) : null]
    );
  } catch (err) {
    // Log to console but don't throw - audit logging should not break the application
    console.error('Failed to log security event:', {
      eventType,
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Get recent audit logs with optional filtering.
 */
export async function getAuditLogs(options: {
  eventType?: SecurityEventType;
  userId?: number;
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
} = {}): Promise<{
  logs: Array<{
    id: number;
    event_type: SecurityEventType;
    user_id: number | null;
    ip_address: string | null;
    user_agent: string | null;
    details: SecurityEventDetails | null;
    created_at: Date;
  }>;
  total: number;
}> {
  const conditions: string[] = [];
  const params: (string | number | Date | null)[] = [];
  let paramIndex = 1;

  if (options.eventType) {
    conditions.push(`event_type = $${paramIndex++}`);
    params.push(options.eventType);
  }

  if (options.userId) {
    conditions.push(`user_id = $${paramIndex++}`);
    params.push(options.userId);
  }

  if (options.startDate) {
    conditions.push(`created_at >= $${paramIndex++}`);
    params.push(options.startDate);
  }

  if (options.endDate) {
    conditions.push(`created_at <= $${paramIndex++}`);
    params.push(options.endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);

  // Get logs with pagination
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  const logsResult = await query(
    `SELECT id, event_type, user_id, ip_address, user_agent, details, created_at
     FROM audit_logs
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset]
  );

  return {
    logs: logsResult.rows.map((row) => ({
      ...row,
      details: row.details ? (typeof row.details === 'string' ? JSON.parse(row.details) : row.details) : null,
    })),
    total,
  };
}

/**
 * Get security statistics for a time period.
 */
export async function getSecurityStats(options: {
  startDate?: Date;
  endDate?: Date;
} = {}): Promise<{
  totalEvents: number;
  eventsByType: Record<SecurityEventType, number>;
  uniqueIps: number;
  uniqueUsers: number;
}> {
  const conditions: string[] = [];
  const params: (Date | null)[] = [];
  let paramIndex = 1;

  if (options.startDate) {
    conditions.push(`created_at >= $${paramIndex++}`);
    params.push(options.startDate);
  }

  if (options.endDate) {
    conditions.push(`created_at <= $${paramIndex++}`);
    params.push(options.endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total events
  const totalResult = await query(
    `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
    params
  );
  const totalEvents = parseInt(totalResult.rows[0].total, 10);

  // Get events by type
  const byTypeResult = await query(
    `SELECT event_type, COUNT(*) as count
     FROM audit_logs
     ${whereClause}
     GROUP BY event_type`,
    params
  );

  const eventsByType: Record<string, number> = {
    LOGIN_SUCCESS: 0,
    LOGIN_FAILURE: 0,
    LOGOUT: 0,
    PASSWORD_CHANGE: 0,
    UNAUTHORIZED_ACCESS: 0,
    RATE_LIMIT_HIT: 0,
  };

  for (const row of byTypeResult.rows) {
    eventsByType[row.event_type] = parseInt(row.count, 10);
  }

  // Get unique IPs and users
  const uniqueResult = await query(
    `SELECT 
       COUNT(DISTINCT ip_address) as unique_ips,
       COUNT(DISTINCT user_id) as unique_users
     FROM audit_logs
     ${whereClause}`,
    params
  );

  return {
    totalEvents,
    eventsByType: eventsByType as Record<SecurityEventType, number>,
    uniqueIps: parseInt(uniqueResult.rows[0].unique_ips, 10),
    uniqueUsers: parseInt(uniqueResult.rows[0].unique_users, 10),
  };
}
