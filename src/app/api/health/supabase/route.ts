import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // simple ping from rpc function
    const { error } = await supabaseAdmin.rpc('ping');

    if (error) {
      console.error('Supabase health check failed:', error);
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Supabase connection failed',
          error: error.message,
          timestamp: new Date().toISOString()
        }, 
        { status: 500 }
      );
    }

    console.log('Supabase health check successful');
    return NextResponse.json({
      status: 'healthy',
      message: 'Supabase connection successful',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}

// Also support POST for Vercel Cron Jobs
export async function POST(request: NextRequest) {
  return GET(request);
}
