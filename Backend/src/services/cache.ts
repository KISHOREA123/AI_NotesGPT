import { redis as redisConfig, cache as cacheConfig } from '@/config';
import { logger } from '@/utils/logger';
import { CacheEntry } from '@/types';

interface UpstashResponse<T = unknown> {
  result: T;
}

class CacheService {
  private baseUrl: string;
  private token: string;
  private requestCount = 0;
  private dailyLimit = 9000; // Leave buffer for 10K limit
  private lastResetDate = new Date().toDateString();

  constructor() {
    this.baseUrl = redisConfig.url;
    this.token = redisConfig.token;
  }

  /**
   * Reset daily request counter if it's a new day
   */
  private resetDailyCounterIfNeeded(): void {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.requestCount = 0;
      this.lastResetDate = today;
      logger.info('Daily cache request counter reset');
    }
  }

  /**
   * Check if we can make a cache request
   */
  private canMakeRequest(): boolean {
    this.resetDailyCounterIfNeeded();
    return this.requestCount < this.dailyLimit;
  }

  /**
   * Make HTTP request to Upstash Redis REST API
   */
  private async makeRequest<T = unknown>(
    command: string[],
    skipLimitCheck = false
  ): Promise<T | null> {
    if (!skipLimitCheck && !this.canMakeRequest()) {
      logger.warn('Cache request limit reached, skipping cache operation');
      return null;
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        throw new Error(`Cache request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as UpstashResponse<T>;
      this.requestCount++;
      
      return data.result;
    } catch (error) {
      logger.error('Cache request failed:', error);
      return null;
    }
  }

  /**
   * Initialize cache service
   */
  async initialize(): Promise<void> {
    try {
      // Test connection with a simple ping
      const result = await this.makeRequest<string>(['PING'], true);
      
      if (result !== 'PONG') {
        throw new Error('Cache ping failed');
      }

      logger.info('Cache service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize cache service:', error);
      throw error;
    }
  }

  /**
   * Get value from cache
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const result = await this.makeRequest<string>(['GET', key]);
      
      if (!result) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(result);
      
      // Check if entry has expired
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        // Delete expired entry (fire and forget)
        void this.delete(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      logger.error(`Failed to get cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set<T = unknown>(
    key: string, 
    value: T, 
    ttlSeconds?: number
  ): Promise<boolean> {
    try {
      const entry: CacheEntry<T> = {
        data: value,
        createdAt: Date.now(),
        expiresAt: ttlSeconds ? Date.now() + (ttlSeconds * 1000) : 0,
      };

      const serialized = JSON.stringify(entry);
      
      let result: string | null;
      if (ttlSeconds) {
        result = await this.makeRequest<string>(['SETEX', key, ttlSeconds.toString(), serialized]);
      } else {
        result = await this.makeRequest<string>(['SET', key, serialized]);
      }

      return result === 'OK';
    } catch (error) {
      logger.error(`Failed to set cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.makeRequest<number>(['DEL', key]);
      return result === 1;
    } catch (error) {
      logger.error(`Failed to delete cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Alias for delete method (for compatibility)
   */
  async del(key: string): Promise<boolean> {
    return this.delete(key);
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.makeRequest<number>(['EXISTS', key]);
      return result === 1;
    } catch (error) {
      logger.error(`Failed to check cache key existence ${key}:`, error);
      return false;
    }
  }

  /**
   * Set multiple keys at once
   */
  async mset(keyValuePairs: Record<string, unknown>, ttlSeconds?: number): Promise<boolean> {
    try {
      const commands: string[] = ['MSET'];
      
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const entry: CacheEntry = {
          data: value,
          createdAt: Date.now(),
          expiresAt: ttlSeconds ? Date.now() + (ttlSeconds * 1000) : 0,
        };
        
        commands.push(key, JSON.stringify(entry));
      }

      const result = await this.makeRequest<string>(commands);
      
      // Set TTL for all keys if specified
      if (ttlSeconds && result === 'OK') {
        const expirePromises = Object.keys(keyValuePairs).map(key =>
          this.makeRequest(['EXPIRE', key, ttlSeconds.toString()])
        );
        await Promise.all(expirePromises);
      }

      return result === 'OK';
    } catch (error) {
      logger.error('Failed to set multiple cache keys:', error);
      return false;
    }
  }

  /**
   * Get multiple keys at once
   */
  async mget<T = unknown>(keys: string[]): Promise<Record<string, T | null>> {
    try {
      const result = await this.makeRequest<(string | null)[]>(['MGET', ...keys]);
      
      if (!result) {
        return {};
      }

      const response: Record<string, T | null> = {};
      
      keys.forEach((key, index) => {
        const value = result[index];
        if (value) {
          try {
            const entry: CacheEntry<T> = JSON.parse(value);
            
            // Check if entry has expired
            if (entry.expiresAt && Date.now() > entry.expiresAt) {
              response[key] = null;
              // Delete expired entry (fire and forget)
              void this.delete(key);
            } else {
              response[key] = entry.data;
            }
          } catch {
            response[key] = null;
          }
        } else {
          response[key] = null;
        }
      });

      return response;
    } catch (error) {
      logger.error('Failed to get multiple cache keys:', error);
      return {};
    }
  }

  /**
   * Increment a numeric value in cache
   */
  async increment(key: string, by = 1): Promise<number | null> {
    try {
      const result = await this.makeRequest<number>(['INCRBY', key, by.toString()]);
      return result;
    } catch (error) {
      logger.error(`Failed to increment cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set expiration time for a key
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      const result = await this.makeRequest<number>(['EXPIRE', key, ttlSeconds.toString()]);
      return result === 1;
    } catch (error) {
      logger.error(`Failed to set expiration for cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get TTL for a key
   */
  async ttl(key: string): Promise<number | null> {
    try {
      const result = await this.makeRequest<number>(['TTL', key]);
      return result;
    } catch (error) {
      logger.error(`Failed to get TTL for cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async clear(): Promise<boolean> {
    try {
      const result = await this.makeRequest<string>(['FLUSHALL']);
      return result === 'OK';
    } catch (error) {
      logger.error('Failed to clear cache:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    requestsToday: number;
    remainingRequests: number;
    limitReached: boolean;
  }> {
    return {
      requestsToday: this.requestCount,
      remainingRequests: Math.max(0, this.dailyLimit - this.requestCount),
      limitReached: this.requestCount >= this.dailyLimit,
    };
  }

  /**
   * Health check for cache service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.makeRequest<string>(['PING'], true);
      return result === 'PONG';
    } catch (error) {
      logger.error('Cache health check failed:', error);
      return false;
    }
  }

  /**
   * Cache key generators for consistent naming
   */
  static keys = {
    userProfile: (userId: string): string => `u:${userId}:p`,
    userNotes: (userId: string, page: number): string => `u:${userId}:n:${page}`,
    noteDetail: (noteId: string): string => `n:${noteId}`,
    aiResult: (jobId: string): string => `ai:${jobId}`,
    subscription: (userId: string): string => `u:${userId}:s`,
    session: (sessionId: string): string => `s:${sessionId}`,
    rateLimitUser: (userId: string): string => `rl:u:${userId}`,
    rateLimitIp: (ip: string): string => `rl:ip:${ip}`,
    aiRequestCount: (userId: string, date: string): string => `ai:count:${userId}:${date}`,
  };

  /**
   * Convenience methods with predefined TTLs
   */
  async setUserProfile<T>(userId: string, data: T): Promise<boolean> {
    return this.set(CacheService.keys.userProfile(userId), data, cacheConfig.ttl.userProfile);
  }

  async getUserProfile<T>(userId: string): Promise<T | null> {
    return this.get<T>(CacheService.keys.userProfile(userId));
  }

  async setUserNotes<T>(userId: string, page: number, data: T): Promise<boolean> {
    return this.set(CacheService.keys.userNotes(userId, page), data, cacheConfig.ttl.notes);
  }

  async getUserNotes<T>(userId: string, page: number): Promise<T | null> {
    return this.get<T>(CacheService.keys.userNotes(userId, page));
  }

  async setAIResult<T>(jobId: string, data: T): Promise<boolean> {
    return this.set(CacheService.keys.aiResult(jobId), data, cacheConfig.ttl.aiResults);
  }

  async getAIResult<T>(jobId: string): Promise<T | null> {
    return this.get<T>(CacheService.keys.aiResult(jobId));
  }

  /**
   * Invalidate user-related cache entries
   */
  async invalidateUserCache(userId: string): Promise<void> {
    const keysToDelete = [
      CacheService.keys.userProfile(userId),
      CacheService.keys.subscription(userId),
    ];

    // Also invalidate paginated notes cache (first few pages)
    for (let page = 1; page <= 5; page++) {
      keysToDelete.push(CacheService.keys.userNotes(userId, page));
    }

    await Promise.all(keysToDelete.map(key => this.delete(key)));
  }
}

// Export singleton instance
export const cache = new CacheService();