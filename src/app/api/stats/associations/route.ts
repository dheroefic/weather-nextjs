
import { NextRequest, NextResponse } from 'next/server';
import { AuthMiddleware } from '@/lib/authMiddleware';
import { AuditLogger } from '@/lib/auditLogger';

// GET /api/stats/associations - Get IP/API key associations
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const endpoint = '/api/stats/associations';

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
        const minHitCount = parseInt(searchParams.get('min_hits') || '1');

        // Get associations
        const associations = await AuditLogger.getAssociations({
          userId: context.user.id,
          apiKeyId: apiKeyId || undefined,
          minHitCount: minHitCount > 0 ? minHitCount : undefined,
        });

        const responseTime = Date.now() - startTime;

        await AuditLogger.logRequest(request, {
          endpoint,
          responseStatus: 200,
          responseTimeMs: responseTime,
          userId: context.user.id,
          apiKeyId: context.apiKey?.id,
          requestParams: { api_key_id: apiKeyId, min_hits: minHitCount },
        });

        const response = NextResponse.json({
          associations,
          total: associations.length,
        });

        return AuthMiddleware.addSecurityHeaders(response);

      } catch (error) {
        console.error('Error fetching associations:', error);
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
