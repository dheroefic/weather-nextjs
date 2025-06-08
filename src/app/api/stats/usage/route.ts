
import { NextRequest, NextResponse } from 'next/server';
import { AuthMiddleware } from '@/lib/authMiddleware';
import { AuditLogger } from '@/lib/auditLogger';

// GET /api/stats/usage - Get API usage statistics
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const endpoint = '/api/stats/usage';

  return AuthMiddleware.withAuth(
    request,
    async (req, context) => {
      try {
        if (!context.user?.id) {
          return NextResponse.json(
            { error: 'User authentication required' },
            { status: 401 }
          );
        }

        const { searchParams } = new URL(request.url);
        const apiKeyId = searchParams.get('api_key_id');
        const days = parseInt(searchParams.get('days') || '30');

        // Validate days parameter
        if (days < 1 || days > 90) {
          return NextResponse.json(
            { error: 'Days parameter must be between 1 and 90' },
            { status: 400 }
          );
        }

        // Create time range
        const timeRange = {
          start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          end: new Date(),
        };

        // Get usage stats
        const stats = await AuditLogger.getAPIUsageStats(
          apiKeyId || undefined,
          context.user.id,
          timeRange
        );

        const responseTime = Date.now() - startTime;

        await AuditLogger.logRequest(request, {
          endpoint,
          responseStatus: 200,
          responseTimeMs: responseTime,
          userId: context.user.id,
          apiKeyId: context.apiKey?.id,
          requestParams: { days, api_key_id: apiKeyId },
        });

        const response = NextResponse.json({
          stats,
          timeRange,
          requestedDays: days,
        });

        return AuthMiddleware.addSecurityHeaders(response);

      } catch (error) {
        console.error('Error fetching usage stats:', error);
        const responseTime = Date.now() - startTime;

        await AuditLogger.logRequest(request, {
          endpoint,
          responseStatus: 500,
          responseTimeMs: responseTime,
          userId: context.user?.id,
          apiKeyId: context.apiKey?.id,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });

        const response = NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );

        return AuthMiddleware.addSecurityHeaders(response);
      }
    },
    {
      requireAuth: true,
      rateLimitConfig: 'default',
    }
  );
}
