import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client with cookies
export const createServerSupabaseClient = async () => {
  const cookieStore = await cookies();
  
  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
};

// Admin client for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export type Database = {
  public: {
    Tables: {
      api_keys: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          key_hash: string;
          role: string;
          created_at: string;
          updated_at: string;
          is_active: boolean;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          key_hash: string;
          role?: string;
          created_at?: string;
          updated_at?: string;
          is_active?: boolean;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          key_hash?: string;
          role?: string;
          created_at?: string;
          updated_at?: string;
          is_active?: boolean;
          expires_at?: string | null;
        };
      };
      api_audit_logs: {
        Row: {
          id: string;
          api_key_id: string | null;
          endpoint: string;
          method: string;
          ip_address: string;
          user_agent: string | null;
          status_code: number;
          response_time_ms: number;
          created_at: string;
          request_size: number | null;
          response_size: number | null;
        };
        Insert: {
          id?: string;
          api_key_id?: string | null;
          endpoint: string;
          method: string;
          ip_address: string;
          user_agent?: string | null;
          status_code: number;
          response_time_ms: number;
          created_at?: string;
          request_size?: number | null;
          response_size?: number | null;
        };
        Update: {
          id?: string;
          api_key_id?: string | null;
          endpoint?: string;
          method?: string;
          ip_address?: string;
          user_agent?: string | null;
          status_code?: number;
          response_time_ms?: number;
          created_at?: string;
          request_size?: number | null;
          response_size?: number | null;
        };
      };
      rate_limits: {
        Row: {
          id: string;
          identifier: string;
          window_start: string;
          request_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          identifier: string;
          window_start: string;
          request_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          identifier?: string;
          window_start?: string;
          request_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
