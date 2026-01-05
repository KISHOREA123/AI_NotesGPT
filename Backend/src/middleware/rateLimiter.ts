import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { Request, Response } from 'express';
import { rateLimiting } from '@/config';
import { cache } from '@/services/cache';
import { logger } from '@/utils/logger';
import { RateLimitError } from '@/middleware/errorHandler';

/**
 * Generate rate limit key based on user ID or IP
 */
function generateKey(req: Request): string {
  const user = (req as any).user;
  if (user?.id) {
    return `user:${user.id}`;
  }
  return `ip:${req.ip}`;
}

/**
 * Custom rate limit handler
 */
function rateLimitHandler(_req: Request, res: Response): void {
  const error = new RateLimitError('Too many requests, please try again later');
  
  res.status(error.statusCode).json({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      retryAfter: res.get('Retry-After'),
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: res.locals['requestId'],
    },
  });
}

/**
 * Skip rate limiting for certain conditions
 */
function skipRateLimit(req: Request): boolean {
  // Skip for health checks
  if (req.path === '/health') {
    return true;
  }

  // Skip for successful requests in development
  if (process.env['NODE_ENV'] === 'development') {
    return false; // Still apply rate limiting in development for testing
  }

  return false;
}

/**
 * General rate limiter
 */
export const rateLimiter = rateLimit({
  windowMs: rateLimiting.windowMs,
  max: rateLimiting.maxRequests,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generateKey,
  handler: rateLimitHandler,
  skip: skipRateLimit,
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authRateLimiter = rateLimit({
  windowMs: rateLimiting.windowMs,
  max: rateLimiting.authMaxRequests,
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generateKey,
  handler: rateLimitHandler,
  skipSuccessfulRequests: true, // Don't count successful auth attempts
});

/**
 * Speed limiter for file uploads
 */
export const uploadSpeedLimiter = slowDown({
  windowMs: rateLimiting.windowMs,
  delayAfter: 5, // Allow 5 requests per window at full speed
  delayMs: () => 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 5000, // Maximum delay of 5 seconds
  keyGenerator: generateKey,
  skip: skipRateLimit,
});

/**
 * AI features rate limiter (stricter for free users)
 */
export const aiRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: (req: Request) => {
    const user = (req as any).user;
    return user?.plan === 'pro' ? 1000 : 50; // Pro users get more requests
  },
  message: 'Daily AI request limit exceeded, please upgrade to Pro for more requests',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    return user?.id ? `user:${user.id}` : `ip:${req.ip}`;
  },
  handler: rateLimitHandler,
  skipSuccessfulRequests: false,
});

/**
 * Create custom rate limiter with specific options
 */
export function createRateLimiter(options: {
  windowMs?: number;
  max: number;
  message?: string;
  keyPrefix?: string;
  skipSuccessful?: boolean;
}) {
  return rateLimit({
    windowMs: options.windowMs || rateLimiting.windowMs,
    max: options.max,
    message: options.message || 'Rate limit exceeded',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: generateKey,
    handler: rateLimitHandler,
    skipSuccessfulRequests: options.skipSuccessful || false,
    skip: skipRateLimit,
  });
}

/**
 * Middleware to check AI request limits manually
 */
export async function checkAIRequestLimit(
  req: Request,
  res: Response,
  next: Function
): Promise<Response | void> {
  try {
    const user = (req as any).user;
    if (!user) {
      return next();
    }

    const today = new Date().toISOString().split('T')[0];
    const key = `ai:count:${user.id}:${today}`;
    
    const currentCount = await cache.get<number>(key) || 0;
    const maxRequests = user.plan === 'pro' ? 1000 : 50;

    if (currentCount >= maxRequests) {
      const error = new RateLimitError(
        `Daily AI request limit (${maxRequests}) exceeded. ${
          user.plan === 'free' ? 'Upgrade to Pro for more requests.' : ''
        }`
      );
      
      return res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: {
            currentCount,
            maxRequests,
            plan: user.plan,
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: res.locals['requestId'],
        },
      });
    }

    // Increment counter
    await cache.set(key, currentCount + 1, 24 * 60 * 60); // 24 hours TTL

    next();
  } catch (error) {
    logger.error('AI rate limit check failed:', error);
    next(); // Allow request if check fails
  }
}