
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { AuthMiddleware } from '@/lib/authMiddleware';
import { AuditLogger } from '@/lib/auditLogger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const endpoint = '/api/auth/register';

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
    const { email, password, name } = body;

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

    // Validate password strength
    if (password.length < 8) {
      const responseTime = Date.now() - startTime;
      
      await AuditLogger.logRequest(request, {
        endpoint,
        responseStatus: 400,
        responseTimeMs: responseTime,
        errorMessage: 'Password too weak',
        requestParams: { email },
      });

      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Register with Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split('@')[0],
        },
      },
    });

    const responseTime = Date.now() - startTime;

    if (error) {
      await AuditLogger.logRequest(request, {
        endpoint,
        responseStatus: 400,
        responseTimeMs: responseTime,
        errorMessage: error.message,
        requestParams: { email },
      });

      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (!data.user) {
      await AuditLogger.logRequest(request, {
        endpoint,
        responseStatus: 400,
        responseTimeMs: responseTime,
        errorMessage: 'Registration failed',
        requestParams: { email },
      });

      return NextResponse.json(
        { error: 'Registration failed' },
        { status: 400 }
      );
    }

    // Log successful registration
    await AuditLogger.logRequest(request, {
      endpoint,
      responseStatus: 201,
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
      message: data.user.email_confirmed_at 
        ? 'Registration successful' 
        : 'Registration successful. Please check your email to confirm your account.',
    }, { status: 201 });

    return AuthMiddleware.addSecurityHeaders(response);

  } catch (error) {
    console.error('Registration error:', error);
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
