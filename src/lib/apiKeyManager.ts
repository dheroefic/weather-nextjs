import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type ApiKey = Database['public']['Tables']['api_keys']['Row'];
type ApiKeyInsert = Database['public']['Tables']['api_keys']['Insert'];

export type ApiKeyRole = 'root' | 'admin' | 'user';

export class ApiKeyManager {
  private static readonly API_KEY_PREFIX = 'wapi_';
  private static readonly API_KEY_LENGTH = 32;

  /**
   * Generate a new API key
   */
  static generateApiKey(): string {
    const randomPart = randomBytes(this.API_KEY_LENGTH).toString('hex');
    return `${this.API_KEY_PREFIX}${randomPart}`;
  }

  /**
   * Hash an API key for secure storage
   */
  static async hashApiKey(apiKey: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(apiKey, saltRounds);
  }

  /**
   * Verify an API key against its hash
   */
  static async verifyApiKey(apiKey: string, hash: string): Promise<boolean> {
    return bcrypt.compare(apiKey, hash);
  }

  /**
   * Create a new API key for a user
   */
  static async createApiKey(
    userId: string,
    name: string,
    role: ApiKeyRole = 'user',
    expiresAt?: Date
  ): Promise<{ apiKey: string; id: string } | null> {
    try {
      const apiKey = this.generateApiKey();
      const keyHash = await this.hashApiKey(apiKey);

      const { data, error } = await supabaseAdmin
        .from('api_keys')
        .insert({
          user_id: userId,
          name,
          key_hash: keyHash,
          role,
          expires_at: expiresAt?.toISOString() || null,
        } as ApiKeyInsert)
        .select('id')
        .single();

      if (error) {
        console.error('Error creating API key:', error);
        return null;
      }

      return { apiKey, id: data.id };
    } catch (error) {
      console.error('Error in createApiKey:', error);
      return null;
    }
  }

  /**
   * Validate an API key and return the associated data
   */
  static async validateApiKey(apiKey: string): Promise<ApiKey | null> {
    try {
      if (!apiKey.startsWith(this.API_KEY_PREFIX)) {
        return null;
      }

      const { data: apiKeys, error } = await supabaseAdmin
        .from('api_keys')
        .select('*')
        .eq('is_active', true);

      if (error || !apiKeys) {
        console.error('Error fetching API keys:', error);
        return null;
      }

      // Check each active API key
      for (const key of apiKeys) {
        const isValid = await this.verifyApiKey(apiKey, key.key_hash);
        if (isValid) {
          // Check if key is expired
          if (key.expires_at && new Date(key.expires_at) < new Date()) {
            await this.deactivateApiKey(key.id);
            return null;
          }
          return key;
        }
      }

      return null;
    } catch (error) {
      console.error('Error in validateApiKey:', error);
      return null;
    }
  }

  /**
   * Deactivate an API key
   */
  static async deactivateApiKey(keyId: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('api_keys')
        .update({ is_active: false })
        .eq('id', keyId);

      return !error;
    } catch (error) {
      console.error('Error deactivating API key:', error);
      return false;
    }
  }

  /**
   * Get API keys for a user
   */
  static async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('api_keys')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user API keys:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserApiKeys:', error);
      return [];
    }
  }

  /**
   * Update API key details
   */
  static async updateApiKey(
    keyId: string,
    updates: { name?: string; is_active?: boolean; expires_at?: Date | null }
  ): Promise<boolean> {
    try {
      const updateData: Record<string, unknown> = { ...updates };
      if (updates.expires_at !== undefined) {
        updateData.expires_at = updates.expires_at?.toISOString() || null;
      }

      const { error } = await supabaseAdmin
        .from('api_keys')
        .update(updateData)
        .eq('id', keyId);

      return !error;
    } catch (error) {
      console.error('Error updating API key:', error);
      return false;
    }
  }

  /**
   * Get a specific API key by ID
   */
  static async getApiKeyById(keyId: string): Promise<ApiKey | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('api_keys')
        .select('*')
        .eq('id', keyId)
        .single();

      if (error) {
        console.error('Error fetching API key by ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getApiKeyById:', error);
      return null;
    }
  }

  /**
   * Check if a role should bypass rate limiting
   */
  static shouldBypassRateLimit(role: ApiKeyRole): boolean {
    return role === 'root';
  }

  /**
   * Delete an API key
   */
  static async deleteApiKey(keyId: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('api_keys')
        .delete()
        .eq('id', keyId);

      return !error;
    } catch (error) {
      console.error('Error deleting API key:', error);
      return false;
    }
  }
}
