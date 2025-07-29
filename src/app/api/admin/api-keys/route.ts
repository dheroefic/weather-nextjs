import { NextRequest, NextResponse } from 'next/server';
import { ApiKeyManager, type ApiKeyRole } from '@/lib/apiKeyManager';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Admin endpoint to create root API keys for database population
 * This endpoint bypasses normal authentication and should be secured at infrastructure level
 */
export async function POST(request: NextRequest) {
  try {
    // Security check - only allow in development or with admin secret
    const adminSecret = request.headers.get('x-admin-secret');
    const expectedSecret = process.env.ADMIN_SECRET;
    
    if (!expectedSecret) {
      return NextResponse.json(
        { error: 'Admin operations not configured' },
        { status: 503 }
      );
    }

    if (adminSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, userId, role = 'root', expiresInDays = 365 } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'API key name is required' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles: ApiKeyRole[] = ['root', 'admin', 'user'];
    if (!validRoles.includes(role as ApiKeyRole)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be one of: root, admin, user' },
        { status: 400 }
      );
    }

    // For admin-created keys, we'll use NULL user_id to bypass foreign key constraints
    const targetUserId = userId || null;

    // Create expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create the API key directly in the database
    const apiKey = ApiKeyManager.generateApiKey();
    const keyHash = await ApiKeyManager.hashApiKey(apiKey);

    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .insert({
        user_id: targetUserId,
        name,
        key_hash: keyHash,
        role: role as ApiKeyRole,
        expires_at: expiresAt.toISOString(),
        is_active: true
      })
      .select('*')
      .single();

    if (error) {
      console.error('Failed to create API key:', error);
      return NextResponse.json(
        { error: 'Failed to create API key', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      apiKey: {
        id: data.id,
        name: data.name,
        key: apiKey, // The actual API key - store this securely!
        role: data.role,
        user_id: targetUserId || 'system',
        created_at: data.created_at,
        expires_at: data.expires_at,
        is_active: data.is_active,
      },
      message: `${role} API key created successfully. Store this key securely - it will not be shown again.`,
      usage: {
        geocoding: `curl -H "Authorization: Bearer ${apiKey}" "http://localhost:3000/api/geocoding?latitude=40.4637&longitude=-3.7492"`,
        weather: `curl -H "Authorization: Bearer ${apiKey}" "http://localhost:3000/api/weather?latitude=40.4637&longitude=-3.7492"`
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating root API key:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * List all API keys (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Security check
    const adminSecret = request.headers.get('x-admin-secret');
    const expectedSecret = process.env.ADMIN_SECRET;
    
    if (!expectedSecret || adminSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: apiKeys, error } = await supabaseAdmin
      .from('api_keys')
      .select(`
        id,
        name,
        user_id,
        created_at,
        updated_at,
        is_active,
        expires_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      apiKeys: apiKeys || [],
      count: apiKeys?.length || 0
    });

  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
