
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { AuthMiddleware } from '@/lib/authMiddleware';
import { AuditLogger } from '@/lib/auditLogger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const endpoint = '/api/auth/logout';

  try {
    // Apply rate limiting but allow public access
    const authResult = await AuthMiddleware.authenticate(request, {
      rateLimitConfig: 'auth',
      allowPublic: true,
      requireAuth: false,
    });

    if (!authResult.success) {
      return authResult.response!;
    }

    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    let accessToken: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    }

    if (accessToken) {
      // Sign out with the provided token
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Logout error:', error);
      }
    }

    const responseTime = Date.now() - startTime;

    // Log logout
    await AuditLogger.logRequest(request, {
      endpoint,
      responseStatus: 200,
      responseTimeMs: responseTime,
      userId: authResult.context?.user?.id,
    });

    const response = NextResponse.json({
      message: 'Logged out successfully',
    });

    return AuthMiddleware.addSecurityHeaders(response);

  } catch (error) {
    console.error('Logout error:', error);
    const responseTime = Date.now() - startTime;

    await AuditLogger.logRequest(request, {
      endpoint,
      responseStatus: 500,
      responseTimeMs: responseTime,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );

    return AuthMiddleware.addSecurityHeaders(response);
  }
}
