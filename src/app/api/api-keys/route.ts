
import { NextRequest, NextResponse } from 'next/server';
import { AuthMiddleware } from '@/lib/authMiddleware';
import { ApiKeyManager } from '@/lib/apiKeyManager';
import { AuditLogger } from '@/lib/auditLogger';

// GET /api/api-keys - List user's API keys
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const endpoint = '/api/api-keys';

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

        const apiKeys = await ApiKeyManager.getUserApiKeys(context.user.id);
        const responseTime = Date.now() - startTime;

        await AuditLogger.logRequest(request, {
          endpoint,
          responseStatus: 200,
          responseTimeMs: responseTime,
          userId: context.user.id,
          apiKeyId: context.apiKey?.id,
        });

        const response = NextResponse.json({
          apiKeys: apiKeys.map(key => ({
            id: key.id,
            name: key.name,
            created_at: key.created_at,
            is_active: key.is_active,
            expires_at: key.expires_at,
            // Don't return the actual key hash
          })),
        });

        return AuthMiddleware.addSecurityHeaders(response);

      } catch (error) {
        console.error('Error fetching API keys:', error);
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

// POST /api/api-keys - Create new API key
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const endpoint = '/api/api-keys';

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

        const body = await request.json();
        const { name, expiresInDays } = body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
          const responseTime = Date.now() - startTime;

          await AuditLogger.logRequest(request, {
            endpoint,
            responseStatus: 400,
            responseTimeMs: responseTime,
            userId: context.user.id,
            apiKeyId: context.apiKey?.id,
            errorMessage: 'API key name is required',
            requestParams: { name: name || 'missing' },
          });

          return NextResponse.json(
            { error: 'API key name is required' },
            { status: 400 }
          );
        }

        // Check if user already has too many API keys
        const existingKeys = await ApiKeyManager.getUserApiKeys(context.user.id);
        if (existingKeys.length >= 10) {
          const responseTime = Date.now() - startTime;

          await AuditLogger.logRequest(request, {
            endpoint,
            responseStatus: 400,
            responseTimeMs: responseTime,
            userId: context.user.id,
            apiKeyId: context.apiKey?.id,
            errorMessage: 'Maximum number of API keys reached',
            requestParams: { name, existingCount: existingKeys.length },
          });

          return NextResponse.json(
            { error: 'Maximum number of API keys (10) reached' },
            { status: 400 }
          );
        }

        // Create expiration date if specified
        let expiresAt: Date | undefined;
        if (expiresInDays && typeof expiresInDays === 'number' && expiresInDays > 0) {
          expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + expiresInDays);
        }

        const result = await ApiKeyManager.createApiKey(
          context.user.id,
          name.trim(),
          'user', // role
          expiresAt
        );

        if (!result) {
          const responseTime = Date.now() - startTime;

          await AuditLogger.logRequest(request, {
            endpoint,
            responseStatus: 500,
            responseTimeMs: responseTime,
            userId: context.user.id,
            apiKeyId: context.apiKey?.id,
            errorMessage: 'Failed to create API key',
            requestParams: { name },
          });

          return NextResponse.json(
            { error: 'Failed to create API key' },
            { status: 500 }
          );
        }

        // Get the full API key data to return to the user
        const createdApiKey = await ApiKeyManager.getApiKeyById(result.id);
        if (!createdApiKey) {
          const responseTime = Date.now() - startTime;

          await AuditLogger.logRequest(request, {
            endpoint,
            responseStatus: 500,
            responseTimeMs: responseTime,
            userId: context.user.id,
            apiKeyId: context.apiKey?.id,
            errorMessage: 'Failed to retrieve created API key',
            requestParams: { name },
          });

          return NextResponse.json(
            { error: 'Failed to retrieve created API key' },
            { status: 500 }
          );
        }

        const responseTime = Date.now() - startTime;

        await AuditLogger.logRequest(request, {
          endpoint,
          responseStatus: 201,
          responseTimeMs: responseTime,
          userId: context.user.id,
          apiKeyId: context.apiKey?.id,
          requestParams: { name, expiresInDays },
        });

        const response = NextResponse.json({
          apiKey: {
            id: createdApiKey.id,
            name: createdApiKey.name,
            key: result.apiKey, // Only returned once during creation
            created_at: createdApiKey.created_at,
            expires_at: createdApiKey.expires_at,
            is_active: createdApiKey.is_active,
          },
          message: 'API key created successfully. Store this key securely - it will not be shown again.',
        }, { status: 201 });

        return AuthMiddleware.addSecurityHeaders(response);

      } catch (error) {
        console.error('Error creating API key:', error);
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
      rateLimitConfig: 'auth',
    }
  );
}
