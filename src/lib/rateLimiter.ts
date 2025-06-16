
import { supabaseAdmin } from './supabase';

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: Date;
  error?: string;
}

export class RateLimiter {
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs = 60000, maxRequests = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  async checkRateLimit(
    identifier: string,
    endpoint: string,
    customLimits?: { windowMs?: number; maxRequests?: number }
  ): Promise<RateLimitResult> {
    try {
      const limits = {
        windowMs: customLimits?.windowMs || this.windowMs,
        maxRequests: customLimits?.maxRequests || this.maxRequests,
      };

      const windowEnd = new Date(Date.now() + limits.windowMs);

      // Get or create rate limit record
      const { data: existingLimit, error: selectError } = await supabaseAdmin
        .from('rate_limits')
        .select('*')
        .eq('identifier', identifier)
        .eq('endpoint', endpoint)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError;
      }

      if (!existingLimit) {
        // Create new rate limit record
        const { error: insertError } = await supabaseAdmin
          .from('rate_limits')
          .insert({
            identifier,
            endpoint,
            request_count: 1,
            window_start: new Date(),
            window_end: windowEnd,
            max_requests: limits.maxRequests,
            window_ms: limits.windowMs,
          });

        if (insertError) throw insertError;

        return {
          success: true,
          remaining: limits.maxRequests - 1,
          resetTime: windowEnd,
        };
      }

      // Check if we're in a new window
      const now = new Date();
      if (now > existingLimit.window_end) {
        // Reset the window
        const { error: updateError } = await supabaseAdmin
          .from('rate_limits')
          .update({
            request_count: 1,
            window_start: now,
            window_end: new Date(now.getTime() + limits.windowMs),
            last_request: now,
          })
          .eq('id', existingLimit.id);

        if (updateError) throw updateError;

        return {
          success: true,
          remaining: limits.maxRequests - 1,
          resetTime: new Date(now.getTime() + limits.windowMs),
        };
      }

      // We're within the current window
      if (existingLimit.request_count >= existingLimit.max_requests) {
        return {
          success: false,
          remaining: 0,
          resetTime: existingLimit.window_end,
          error: 'Rate limit exceeded',
        };
      }

      // Increment the request count
      const { error: incrementError } = await supabaseAdmin
        .from('rate_limits')
        .update({
          request_count: existingLimit.request_count + 1,
          last_request: now,
        })
        .eq('id', existingLimit.id);

      if (incrementError) throw incrementError;

      return {
        success: true,
        remaining: existingLimit.max_requests - existingLimit.request_count - 1,
        resetTime: existingLimit.window_end,
      };
    } catch (error) {
      console.error('Rate limiter error:', error);
      return {
        success: false,
        remaining: 0,
        resetTime: new Date(),
        error: 'Rate limiting service error',
      };
    }
  }

  async resetRateLimit(identifier: string, endpoint: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('rate_limits')
        .delete()
        .eq('identifier', identifier)
        .eq('endpoint', endpoint);

      return !error;
    } catch (error) {
      console.error('Error resetting rate limit:', error);
      return false;
    }
  }

  async getRateLimitInfo(
    identifier: string,
    endpoint: string
  ): Promise<RateLimitResult | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('rate_limits')
        .select('*')
        .eq('identifier', identifier)
        .eq('endpoint', endpoint)
        .single();

      if (error || !data) return null;

      const remaining = Math.max(0, data.max_requests - data.request_count);

      return {
        success: remaining > 0,
        remaining,
        resetTime: data.window_end,
      };
    } catch (error) {
      console.error('Error getting rate limit info:', error);
      return null;
    }
  }

  async cleanupExpiredRecords(): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('rate_limits')
        .delete()
        .lt('window_end', new Date().toISOString());

      if (error) {
        console.error('Error cleaning up expired rate limit records:', error);
      }
    } catch (error) {
      console.error('Error in cleanup:', error);
    }
  }
}

// Default rate limiter instance
export const defaultRateLimiter = new RateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
);

// Rate limit configurations for different endpoints
export const rateLimitConfigs = {
  background: { windowMs: 60000, maxRequests: 30 }, // 30 requests per minute for background images
  weather: { windowMs: 60000, maxRequests: 100 }, // 100 requests per minute for weather data
  auth: { windowMs: 300000, maxRequests: 5 }, // 5 auth attempts per 5 minutes
  default: { windowMs: 60000, maxRequests: 50 }, // Default limit
} as const;

export type RateLimitConfigKey = keyof typeof rateLimitConfigs;
