
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { AuthMiddleware } from '@/lib/authMiddleware';
import { AuditLogger } from '@/lib/auditLogger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const endpoint = '/api/auth/login';

  try {
    // Apply rate limiting for auth endpoints
    const authResult = await AuthMiddleware.authenticate(request, {
      rateLimitConfig: 'auth',
      allowPublic: true,
      requireAuth: false,
    });

    if (!authResult.success) {
      return authResult.response!;
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      const responseTime = Date.now() - startTime;
      
      await AuditLogger.logRequest(request, {
        endpoint,
        responseStatus: 400,
        responseTimeMs: responseTime,
        errorMessage: 'Email and password are required',
        requestParams: { email: email ? 'provided' : 'missing' },
      });

      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    const responseTime = Date.now() - startTime;

    if (error) {
      await AuditLogger.logRequest(request, {
        endpoint,
        responseStatus: 401,
        responseTimeMs: responseTime,
        errorMessage: error.message,
        requestParams: { email },
      });

      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (!data.user || !data.session) {
      await AuditLogger.logRequest(request, {
        endpoint,
        responseStatus: 401,
        responseTimeMs: responseTime,
        errorMessage: 'No user session created',
        requestParams: { email },
      });

      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    // Log successful login
    await AuditLogger.logRequest(request, {
      endpoint,
      responseStatus: 200,
      responseTimeMs: responseTime,
      userId: data.user.id,
      requestParams: { email },
    });

    const response = NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        created_at: data.user.created_at,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    });

    return AuthMiddleware.addSecurityHeaders(response);

  } catch (error) {
    console.error('Login error:', error);
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
