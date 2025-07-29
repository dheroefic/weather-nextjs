
import { NextRequest } from 'next/server';
import { supabaseAdmin } from './supabase';

export interface AuditLogEntry {
  endpoint: string;
  method: string;
  ip_address: string;
  user_agent: string;
  api_key_id?: string;
  user_id?: string;
  request_params?: Record<string, unknown>;
  response_status: number;
  response_time_ms: number;
  error_message?: string;
  request_size_bytes?: number;
  response_size_bytes?: number;
}

export interface AssociationEntry {
  ip_address: string;
  api_key_id?: string;
  user_id?: string;
  hit_count: number;
  first_seen: Date;
  last_seen: Date;
  user_agent?: string;
  country?: string;
  city?: string;
}

export class AuditLogger {
  private static getClientIP(request: NextRequest): string {
    // Check various headers for the real client IP
    const xForwardedFor = request.headers.get('x-forwarded-for');
    const xRealIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    
    if (xForwardedFor) {
      // x-forwarded-for can contain multiple IPs, take the first one
      return xForwardedFor.split(',')[0].trim();
    }
    
    if (xRealIP) {
      return xRealIP;
    }
    
    if (cfConnectingIP) {
      return cfConnectingIP;
    }
    
    // Fallback - get from URL or use unknown
    return 'unknown';
  }

  private static getUserAgent(request: NextRequest): string {
    return request.headers.get('user-agent') || 'unknown';
  }

  private static getRequestSize(request: NextRequest): number {
    const contentLength = request.headers.get('content-length');
    return contentLength ? parseInt(contentLength, 10) : 0;
  }

  static async logRequest(
    request: NextRequest,
    options: {
      endpoint: string;
      responseStatus: number;
      responseTimeMs: number;
      apiKeyId?: string;
      userId?: string;
      requestParams?: Record<string, unknown>;
      errorMessage?: string;
      responseSizeBytes?: number;
    }
  ): Promise<void> {
    try {
      const ip = this.getClientIP(request);
      const userAgent = this.getUserAgent(request);
      const requestSize = this.getRequestSize(request);

      const auditEntry: Omit<AuditLogEntry, 'id' | 'created_at'> = {
        endpoint: options.endpoint,
        method: request.method,
        ip_address: ip,
        user_agent: userAgent,
        api_key_id: options.apiKeyId || undefined,
        user_id: options.userId || undefined,
        request_params: options.requestParams,
        response_status: options.responseStatus,
        response_time_ms: options.responseTimeMs,
        error_message: options.errorMessage,
        request_size_bytes: requestSize,
        response_size_bytes: options.responseSizeBytes,
      };

      // Insert audit log entry
      const { error: auditError } = await supabaseAdmin
        .from('api_audit_logs')
        .insert(auditEntry);

      if (auditError) {
        console.error('Failed to insert audit log:', auditError);
      }

      // Update or create association entry
      await this.updateAssociation(ip, options.apiKeyId, options.userId, userAgent);

    } catch (error) {
      console.error('Audit logging error:', error);
    }
  }

  private static async updateAssociation(
    ipAddress: string,
    apiKeyId?: string,
    userId?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      // Build query to find existing association
      let query = supabaseAdmin
        .from('associations')
        .select('*')
        .eq('ip_address', ipAddress);

      // Handle null values properly for UUID fields
      if (apiKeyId) {
        query = query.eq('api_key_id', apiKeyId);
      } else {
        query = query.is('api_key_id', null);
      }

      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.is('user_id', null);
      }

      const { data: existing, error: selectError } = await query.single();

      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError;
      }

      const now = new Date();

      if (existing) {
        // Update existing association
        const { error: updateError } = await supabaseAdmin
          .from('associations')
          .update({
            hit_count: existing.hit_count + 1,
            last_seen: now,
            user_agent: userAgent || existing.user_agent,
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error('Failed to update association:', updateError);
        }
      } else {
        // Create new association - only include UUID fields if they have values
        const insertData: Record<string, unknown> = {
          ip_address: ipAddress,
          hit_count: 1,
          first_seen: now,
          last_seen: now,
          user_agent: userAgent,
        };

        if (apiKeyId) {
          insertData.api_key_id = apiKeyId;
        }

        if (userId) {
          insertData.user_id = userId;
        }

        const { error: insertError } = await supabaseAdmin
          .from('associations')
          .insert(insertData);

        if (insertError) {
          console.error('Failed to create association:', insertError);
        }
      }
    } catch (error) {
      console.error('Association update error:', error);
    }
  }

  static async getAPIUsageStats(
    apiKeyId?: string,
    userId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    totalRequests: number;
    uniqueIPs: number;
    avgResponseTime: number;
    errorRate: number;
    topEndpoints: Array<{ endpoint: string; count: number }>;
  }> {
    try {
      let query = supabaseAdmin
        .from('api_audit_logs')
        .select('endpoint, response_status, response_time_ms, ip_address');

      if (apiKeyId) {
        query = query.eq('api_key_id', apiKeyId);
      }

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (timeRange) {
        query = query
          .gte('created_at', timeRange.start.toISOString())
          .lte('created_at', timeRange.end.toISOString());
      }

      const { data: logs, error } = await query;

      if (error) throw error;

      if (!logs || logs.length === 0) {
        return {
          totalRequests: 0,
          uniqueIPs: 0,
          avgResponseTime: 0,
          errorRate: 0,
          topEndpoints: [],
        };
      }

      const totalRequests = logs.length;
      const uniqueIPs = new Set(logs.map(log => log.ip_address)).size;
      const avgResponseTime = logs.reduce((sum, log) => sum + log.response_time_ms, 0) / totalRequests;
      const errorCount = logs.filter(log => log.response_status >= 400).length;
      const errorRate = (errorCount / totalRequests) * 100;

      // Count endpoint usage
      const endpointCounts = logs.reduce((acc, log) => {
        acc[log.endpoint] = (acc[log.endpoint] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topEndpoints = Object.entries(endpointCounts)
        .map(([endpoint, count]) => ({ endpoint, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalRequests,
        uniqueIPs,
        avgResponseTime: Math.round(avgResponseTime),
        errorRate: Math.round(errorRate * 100) / 100,
        topEndpoints,
      };
    } catch (error) {
      console.error('Error getting API usage stats:', error);
      return {
        totalRequests: 0,
        uniqueIPs: 0,
        avgResponseTime: 0,
        errorRate: 0,
        topEndpoints: [],
      };
    }
  }

  static async getAssociations(
    filters?: {
      ipAddress?: string;
      apiKeyId?: string;
      userId?: string;
      minHitCount?: number;
    }
  ): Promise<AssociationEntry[]> {
    try {
      let query = supabaseAdmin
        .from('associations')
        .select('*')
        .order('hit_count', { ascending: false });

      if (filters?.ipAddress) {
        query = query.eq('ip_address', filters.ipAddress);
      }

      if (filters?.apiKeyId) {
        query = query.eq('api_key_id', filters.apiKeyId);
      }

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters?.minHitCount) {
        query = query.gte('hit_count', filters.minHitCount);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting associations:', error);
      return [];
    }
  }

  static async cleanupOldLogs(daysToKeep = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // Clean up old audit logs
      const { error: auditError } = await supabaseAdmin
        .from('api_audit_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (auditError) {
        console.error('Error cleaning up audit logs:', auditError);
      }

      // Clean up associations with no recent activity
      const { error: assocError } = await supabaseAdmin
        .from('associations')
        .delete()
        .lt('last_seen', cutoffDate.toISOString());

      if (assocError) {
        console.error('Error cleaning up associations:', assocError);
      }
    } catch (error) {
      console.error('Error in cleanup:', error);
    }
  }

  static async getSuspiciousActivity(): Promise<Array<{
    ip_address: string;
    total_requests: number;
    error_rate: number;
    unique_endpoints: number;
    recent_errors: number;
  }>> {
    try {
      // Get IPs with high error rates or request volumes in the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const { data, error } = await supabaseAdmin
        .from('api_audit_logs')
        .select('ip_address, response_status, endpoint')
        .gte('created_at', oneHourAgo.toISOString());

      if (error || !data) return [];

      // Analyze patterns by IP
      const ipStats = data.reduce((acc, log) => {
        const ip = log.ip_address;
        if (!acc[ip]) {
          acc[ip] = {
            total: 0,
            errors: 0,
            endpoints: new Set(),
          };
        }
        acc[ip].total += 1;
        if (log.response_status >= 400) {
          acc[ip].errors += 1;
        }
        acc[ip].endpoints.add(log.endpoint);
        return acc;
      }, {} as Record<string, { total: number; errors: number; endpoints: Set<string> }>);

      // Filter for suspicious patterns
      const suspicious = Object.entries(ipStats)
        .map(([ip, stats]) => ({
          ip_address: ip,
          total_requests: stats.total,
          error_rate: (stats.errors / stats.total) * 100,
          unique_endpoints: stats.endpoints.size,
          recent_errors: stats.errors,
        }))
        .filter(
          stat =>
            stat.total_requests > 100 || // High volume
            stat.error_rate > 50 || // High error rate
            stat.recent_errors > 20 // Many recent errors
        )
        .sort((a, b) => b.total_requests - a.total_requests);

      return suspicious;
    } catch (error) {
      console.error('Error getting suspicious activity:', error);
      return [];
    }
  }
}

export default AuditLogger;
