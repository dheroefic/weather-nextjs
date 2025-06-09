import { NextRequest, NextResponse } from 'next/server';
import { ApiKeyManager } from './apiKeyManager';
import { defaultRateLimiter, rateLimitConfigs, RateLimitConfigKey } from './rateLimiter';
import { AuditLogger } from './auditLogger';

export interface AuthContext {
  apiKey?: {
    id: string;
    userId: string;
    name: string;
  };
  user?: {
    id: string;
  };
  ipAddress: string;
  userAgent: string;
  isAuthenticated: boolean;
}

export interface MiddlewareOptions {
  requireAuth?: boolean;
  rateLimitConfig?: RateLimitConfigKey;
  customRateLimit?: { windowMs: number; maxRequests: number };
  allowPublic?: boolean;
  skipAudit?: boolean;
}

export class AuthMiddleware {
  private static extractAPIKey(request: NextRequest): string | null {
    // Check Authorization header (Bearer token)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check x-api-key header
    const apiKeyHeader = request.headers.get('x-api-key');
    if (apiKeyHeader) {
      return apiKeyHeader;
    }

    // Check query parameter
    const { searchParams } = new URL(request.url);
    const apiKeyParam = searchParams.get('api_key');
    if (apiKeyParam) {
      return apiKeyParam;
    }

    return null;
  }

  private static getClientIP(request: NextRequest): string {
    const xForwardedFor = request.headers.get('x-forwarded-for');
    const xRealIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    
    if (xForwardedFor) {
      return xForwardedFor.split(',')[0].trim();
    }
    
    if (xRealIP) {
      return xRealIP;
    }
    
    if (cfConnectingIP) {
      return cfConnectingIP;
    }
    
    return 'unknown';
  }

  private static getUserAgent(request: NextRequest): string {
    return request.headers.get('user-agent') || 'unknown';
  }

  static async authenticate(
    request: NextRequest,
    options: MiddlewareOptions = {}
  ): Promise<{
    success: boolean;
    context?: AuthContext;
    response?: NextResponse;
    error?: string;
  }> {
    const startTime = Date.now();
    const ipAddress = this.getClientIP(request);
    const userAgent = this.getUserAgent(request);
    const endpoint = new URL(request.url).pathname;

    try {
      // Extract API key
      const apiKeyValue = this.extractAPIKey(request);
      
      let authContext: AuthContext = {
        ipAddress,
        userAgent,
        isAuthenticated: false,
      };

      // Verify API key if provided
      if (apiKeyValue) {
        const apiKeyData = await ApiKeyManager.validateApiKey(apiKeyValue);
        
        if (!apiKeyData) {
          const responseTime = Date.now() - startTime;
          
          if (!options.skipAudit) {
            await AuditLogger.logRequest(request, {
              endpoint,
              responseStatus: 401,
              responseTimeMs: responseTime,
              errorMessage: 'Invalid API key',
            });
          }

          return {
            success: false,
            error: 'Invalid API key',
            response: NextResponse.json(
              { error: 'Invalid API key' },
              { status: 401 }
            ),
          };
        }

        authContext = {
          ...authContext,
          apiKey: {
            id: apiKeyData.id,
            userId: apiKeyData.user_id,
            name: apiKeyData.name,
          },
          user: {
            id: apiKeyData.user_id,
          },
          isAuthenticated: true,
        };
      } else if (options.requireAuth && !options.allowPublic) {
        const responseTime = Date.now() - startTime;
        
        if (!options.skipAudit) {
          await AuditLogger.logRequest(request, {
            endpoint,
            responseStatus: 401,
            responseTimeMs: responseTime,
            errorMessage: 'API key required',
          });
        }

        return {
          success: false,
          error: 'API key required',
          response: NextResponse.json(
            { error: 'API key required' },
            { status: 401 }
          ),
        };
      }

      // Apply rate limiting
      const rateLimitKey = authContext.apiKey?.id || ipAddress;
      const rateConfig = options.customRateLimit || 
                       (options.rateLimitConfig ? rateLimitConfigs[options.rateLimitConfig] : rateLimitConfigs.default);

      const rateLimitResult = await defaultRateLimiter.checkRateLimit(
        rateLimitKey,
        endpoint,
        rateConfig
      );

      if (!rateLimitResult.success) {
        const responseTime = Date.now() - startTime;
        
        if (!options.skipAudit) {
          await AuditLogger.logRequest(request, {
            endpoint,
            responseStatus: 429,
            responseTimeMs: responseTime,
            apiKeyId: authContext.apiKey?.id,
            userId: authContext.user?.id,
            errorMessage: rateLimitResult.error,
          });
        }

        const response = NextResponse.json(
          { 
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil((rateLimitResult.resetTime.getTime() - Date.now()) / 1000)
          },
          { status: 429 }
        );

        // Add rate limit headers
        response.headers.set('X-RateLimit-Limit', rateConfig.maxRequests.toString());
        response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
        response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toISOString());
        response.headers.set('Retry-After', Math.ceil((rateLimitResult.resetTime.getTime() - Date.now()) / 1000).toString());

        return {
          success: false,
          error: 'Rate limit exceeded',
          response,
        };
      }

      return {
        success: true,
        context: authContext,
      };

    } catch (error) {
      console.error('Authentication middleware error:', error);
      const responseTime = Date.now() - startTime;
      
      if (!options.skipAudit) {
        await AuditLogger.logRequest(request, {
          endpoint,
          responseStatus: 500,
          responseTimeMs: responseTime,
          errorMessage: 'Authentication service error',
        });
      }

      return {
        success: false,
        error: 'Authentication service error',
        response: NextResponse.json(
          { error: 'Authentication service error' },
          { status: 500 }
        ),
      };
    }
  }

  static async withAuth<T extends Response | NextResponse>(
    request: NextRequest,
    handler: (request: NextRequest, context: AuthContext) => Promise<T>,
    options: MiddlewareOptions = {}
  ): Promise<T | NextResponse> {
    const authResult = await this.authenticate(request, options);
    
    if (!authResult.success) {
      return authResult.response!;
    }

    const startTime = Date.now();
    
    try {
      const result = await handler(request, authResult.context!);
      
      // Log successful request if not skipped
      if (!options.skipAudit) {
        const responseTime = Date.now() - startTime;
        const status = result instanceof NextResponse ? result.status : 200;
        
        await AuditLogger.logRequest(request, {
          endpoint: new URL(request.url).pathname,
          responseStatus: status,
          responseTimeMs: responseTime,
          apiKeyId: authResult.context!.apiKey?.id,
          userId: authResult.context!.user?.id,
        });
      }

      return result;
    } catch (error) {
      console.error('Handler error:', error);
      
      if (!options.skipAudit) {
        const responseTime = Date.now() - startTime;
        await AuditLogger.logRequest(request, {
          endpoint: new URL(request.url).pathname,
          responseStatus: 500,
          responseTimeMs: responseTime,
          apiKeyId: authResult.context!.apiKey?.id,
          userId: authResult.context!.user?.id,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }

  static addSecurityHeaders(response: NextResponse): NextResponse {
    // Security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    // CORS headers for API endpoints
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    
    return response;
  }
}

// Helper function for easy use in API routes
export async function authenticateRequest(
  request: NextRequest,
  options: MiddlewareOptions = {}
) {
  return AuthMiddleware.authenticate(request, options);
}

export default AuthMiddleware;
