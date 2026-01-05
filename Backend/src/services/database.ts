import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { database } from '@/config';
import { logger } from '@/utils/logger';

// Database schema types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          name: string;
          plan: 'free' | 'pro';
          subscription_id: string | null;
          subscription_status: string | null;
          email_verified: boolean;
          created_at: string;
          updated_at: string;
          last_login_at: string | null;
          preferences: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          email: string;
          password_hash: string;
          name: string;
          plan?: 'free' | 'pro';
          subscription_id?: string | null;
          subscription_status?: string | null;
          email_verified?: boolean;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
          preferences?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          email?: string;
          password_hash?: string;
          name?: string;
          plan?: 'free' | 'pro';
          subscription_id?: string | null;
          subscription_status?: string | null;
          email_verified?: boolean;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
          preferences?: Record<string, unknown>;
        };
      };
      notes: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content: string;
          color: string;
          is_pinned: boolean;
          is_deleted: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
          version: number;
          search_vector: unknown;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          content: string;
          color?: string;
          is_pinned?: boolean;
          is_deleted?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
          version?: number;
          search_vector?: unknown;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          content?: string;
          color?: string;
          is_pinned?: boolean;
          is_deleted?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
          version?: number;
          search_vector?: unknown;
        };
      };
      attachments: {
        Row: {
          id: string;
          note_id: string;
          user_id: string;
          filename: string;
          original_filename: string;
          mime_type: string;
          file_size: number;
          storage_url: string;
          thumbnail_url: string | null;
          public_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          note_id: string;
          user_id: string;
          filename: string;
          original_filename: string;
          mime_type: string;
          file_size: number;
          storage_url: string;
          thumbnail_url?: string | null;
          public_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          note_id?: string;
          user_id?: string;
          filename?: string;
          original_filename?: string;
          mime_type?: string;
          file_size?: number;
          storage_url?: string;
          thumbnail_url?: string | null;
          public_id?: string | null;
          created_at?: string;
        };
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          refresh_token: string;
          device_info: Record<string, unknown> | null;
          ip_address: string | null;
          expires_at: string;
          created_at: string;
          last_used_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          refresh_token: string;
          device_info?: Record<string, unknown> | null;
          ip_address?: string | null;
          expires_at: string;
          created_at?: string;
          last_used_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          refresh_token?: string;
          device_info?: Record<string, unknown> | null;
          ip_address?: string | null;
          expires_at?: string;
          created_at?: string;
          last_used_at?: string;
        };
      };
      ai_jobs: {
        Row: {
          id: string;
          user_id: string;
          note_id: string | null;
          job_type: 'summarize' | 'grammar_check' | 'voice_to_text';
          status: 'pending' | 'processing' | 'completed' | 'failed';
          input_data: Record<string, unknown>;
          result_data: Record<string, unknown> | null;
          error_message: string | null;
          processing_time_ms: number | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          note_id?: string | null;
          job_type: 'summarize' | 'grammar_check' | 'voice_to_text';
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          input_data: Record<string, unknown>;
          result_data?: Record<string, unknown> | null;
          error_message?: string | null;
          processing_time_ms?: number | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          note_id?: string | null;
          job_type?: 'summarize' | 'grammar_check' | 'voice_to_text';
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          input_data?: Record<string, unknown>;
          result_data?: Record<string, unknown> | null;
          error_message?: string | null;
          processing_time_ms?: number | null;
          created_at?: string;
          completed_at?: string | null;
        };
      };
    };
  };
}

class DatabaseService {
  private client: SupabaseClient<Database>;
  private isConnected = false;

  constructor() {
    this.client = createClient<Database>(database.url, database.serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
    });
  }

  /**
   * Initialize database connection and verify connectivity
   */
  async initialize(): Promise<void> {
    try {
      // Test connection by running a simple query
      const { error } = await this.client
        .from('users')
        .select('id')
        .limit(1);

      if (error) {
        throw new Error(`Database connection failed: ${error.message}`);
      }

      this.isConnected = true;
      logger.info('Database connection established successfully');
    } catch (error) {
      logger.error('Failed to initialize database connection:', error);
      throw error;
    }
  }

  /**
   * Get the Supabase client instance
   */
  getClient(): SupabaseClient<Database> {
    if (!this.isConnected) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.client;
  }

  /**
   * Check database health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('users')
        .select('id')
        .limit(1);

      return !error;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Execute a raw SQL query (use with caution)
   */
  async executeRawQuery(_query: string, _params?: unknown[]): Promise<unknown> {
    try {
      // Note: Supabase doesn't support arbitrary SQL execution via client
      // This would need to be implemented as a custom function in Supabase
      // For now, we'll throw an error
      throw new Error('Raw SQL execution not supported in Supabase client');
    } catch (error) {
      logger.error('Raw query execution failed:', error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    users: number;
    notes: number;
    attachments: number;
    aiJobs: number;
  }> {
    try {
      const [usersResult, notesResult, attachmentsResult, aiJobsResult] = await Promise.all([
        this.client.from('users').select('id', { count: 'exact', head: true }),
        this.client.from('notes').select('id', { count: 'exact', head: true }),
        this.client.from('attachments').select('id', { count: 'exact', head: true }),
        this.client.from('ai_jobs').select('id', { count: 'exact', head: true }),
      ]);

      return {
        users: usersResult.count || 0,
        notes: notesResult.count || 0,
        attachments: attachmentsResult.count || 0,
        aiJobs: aiJobsResult.count || 0,
      };
    } catch (error) {
      logger.error('Failed to get database stats:', error);
      throw error;
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const { data, error } = await this.client
        .from('sessions')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) {
        throw new Error(`Session cleanup failed: ${error.message}`);
      }

      const deletedCount = data?.length || 0;
      logger.info(`Cleaned up ${deletedCount} expired sessions`);
      return deletedCount;
    } catch (error) {
      logger.error('Session cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Archive old deleted notes (permanent deletion after 30 days)
   */
  async archiveOldDeletedNotes(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await this.client
        .from('notes')
        .delete()
        .eq('is_deleted', true)
        .lt('deleted_at', thirtyDaysAgo.toISOString())
        .select('id');

      if (error) {
        throw new Error(`Note archival failed: ${error.message}`);
      }

      const archivedCount = data?.length || 0;
      logger.info(`Archived ${archivedCount} old deleted notes`);
      return archivedCount;
    } catch (error) {
      logger.error('Note archival failed:', error);
      throw error;
    }
  }

  /**
   * Get database size information (for monitoring free tier limits)
   */
  async getDatabaseSize(): Promise<{
    totalSize: number;
    tablesSizes: Record<string, number>;
  }> {
    try {
      // This would require a custom function in Supabase
      // For now, we'll estimate based on record counts
      const stats = await this.getStats();
      
      // Rough estimates (in bytes)
      const estimatedSizes = {
        users: stats.users * 1024, // ~1KB per user
        notes: stats.notes * 2048, // ~2KB per note
        attachments: stats.attachments * 512, // ~512B per attachment record
        ai_jobs: stats.aiJobs * 1024, // ~1KB per AI job
      };

      const totalSize = Object.values(estimatedSizes).reduce((sum, size) => sum + size, 0);

      return {
        totalSize,
        tablesSizes: estimatedSizes,
      };
    } catch (error) {
      logger.error('Failed to get database size:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    // Supabase client doesn't need explicit closing
    this.isConnected = false;
    logger.info('Database connection closed');
  }
}

// Export singleton instance
export const db = new DatabaseService();

// Export types for use in other modules
export type { Database as DatabaseSchema };
export type DatabaseClient = SupabaseClient<Database>;