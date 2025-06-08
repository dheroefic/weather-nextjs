
import { NextRequest, NextResponse } from 'next/server';
import { AuthMiddleware } from '@/lib/authMiddleware';
import { ApiKeyManager } from '@/lib/apiKeyManager';
import { AuditLogger } from '@/lib/auditLogger';

// PUT /api/api-keys/[id] - Update API key
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  const endpoint = `/api/api-keys/${params.id}`;

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
        const { name, is_active } = body;

        // Validate the API key belongs to the user
        const existingKey = await ApiKeyManager.getApiKeyById(params.id);
        if (!existingKey || existingKey.user_id !== context.user.id) {
          const responseTime = Date.now() - startTime;

          await AuditLogger.logRequest(request, {
            endpoint,
            responseStatus: 404,
            responseTimeMs: responseTime,
            userId: context.user.id,
            apiKeyId: context.apiKey?.id,
            errorMessage: 'API key not found',
            requestParams: { keyId: params.id },
          });

          return NextResponse.json(
            { error: 'API key not found' },
            { status: 404 }
          );
        }

        const updateData: Partial<{ name: string; is_active: boolean }> = {};

        if (name !== undefined) {
          if (typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json(
              { error: 'Invalid name provided' },
              { status: 400 }
            );
          }
          updateData.name = name.trim();
        }

        if (is_active !== undefined) {
          if (typeof is_active !== 'boolean') {
            return NextResponse.json(
              { error: 'Invalid is_active value' },
              { status: 400 }
            );
          }
          updateData.is_active = is_active;
        }

        if (Object.keys(updateData).length === 0) {
          return NextResponse.json(
            { error: 'No valid fields to update' },
            { status: 400 }
          );
        }

        const result = await ApiKeyManager.updateApiKey(params.id, updateData);

        if (!result) {
          const responseTime = Date.now() - startTime;

          await AuditLogger.logRequest(request, {
            endpoint,
            responseStatus: 500,
            responseTimeMs: responseTime,
            userId: context.user.id,
            apiKeyId: context.apiKey?.id,
            errorMessage: 'Failed to update API key',
            requestParams: { keyId: params.id, ...updateData },
          });

          return NextResponse.json(
            { error: 'Failed to update API key' },
            { status: 500 }
          );
        }

        // Get the updated API key data
        const updatedApiKey = await ApiKeyManager.getApiKeyById(params.id);
        if (!updatedApiKey) {
          const responseTime = Date.now() - startTime;

          await AuditLogger.logRequest(request, {
            endpoint,
            responseStatus: 500,
            responseTimeMs: responseTime,
            userId: context.user.id,
            apiKeyId: context.apiKey?.id,
            errorMessage: 'Failed to retrieve updated API key',
            requestParams: { keyId: params.id, ...updateData },
          });

          return NextResponse.json(
            { error: 'Failed to retrieve updated API key' },
            { status: 500 }
          );
        }

        const responseTime = Date.now() - startTime;

        await AuditLogger.logRequest(request, {
          endpoint,
          responseStatus: 200,
          responseTimeMs: responseTime,
          userId: context.user.id,
          apiKeyId: context.apiKey?.id,
          requestParams: { keyId: params.id, ...updateData },
        });

        const response = NextResponse.json({
          apiKey: {
            id: updatedApiKey.id,
            name: updatedApiKey.name,
            created_at: updatedApiKey.created_at,
            updated_at: updatedApiKey.updated_at,
            is_active: updatedApiKey.is_active,
            expires_at: updatedApiKey.expires_at,
          },
        });

        return AuthMiddleware.addSecurityHeaders(response);

      } catch (error) {
        console.error('Error updating API key:', error);
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

// DELETE /api/api-keys/[id] - Delete API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  const endpoint = `/api/api-keys/${params.id}`;

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

        // Validate the API key belongs to the user
        const existingKey = await ApiKeyManager.getApiKeyById(params.id);
        if (!existingKey || existingKey.user_id !== context.user.id) {
          const responseTime = Date.now() - startTime;

          await AuditLogger.logRequest(request, {
            endpoint,
            responseStatus: 404,
            responseTimeMs: responseTime,
            userId: context.user.id,
            apiKeyId: context.apiKey?.id,
            errorMessage: 'API key not found',
            requestParams: { keyId: params.id },
          });

          return NextResponse.json(
            { error: 'API key not found' },
            { status: 404 }
          );
        }

        const result = await ApiKeyManager.deleteApiKey(params.id);

        if (!result) {
          const responseTime = Date.now() - startTime;

          await AuditLogger.logRequest(request, {
            endpoint,
            responseStatus: 500,
            responseTimeMs: responseTime,
            userId: context.user.id,
            apiKeyId: context.apiKey?.id,
            errorMessage: 'Failed to delete API key',
            requestParams: { keyId: params.id },
          });

          return NextResponse.json(
            { error: 'Failed to delete API key' },
            { status: 500 }
          );
        }

        const responseTime = Date.now() - startTime;

        await AuditLogger.logRequest(request, {
          endpoint,
          responseStatus: 200,
          responseTimeMs: responseTime,
          userId: context.user.id,
          apiKeyId: context.apiKey?.id,
          requestParams: { keyId: params.id },
        });

        const response = NextResponse.json({
          message: 'API key deleted successfully',
        });

        return AuthMiddleware.addSecurityHeaders(response);

      } catch (error) {
        console.error('Error deleting API key:', error);
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
