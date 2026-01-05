import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwt as jwtConfig } from '@/config';
import { db } from '@/services/database';
import { AuthenticationError, AuthorizationError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { User } from '@/types';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * JWT Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw new AuthenticationError('Access token required');
    }

    // Verify JWT token
    const decoded = jwt.verify(token, jwtConfig.secret) as any;
    
    if (decoded.type !== 'access') {
      throw new AuthenticationError('Invalid token type');
    }

    // Get user from database
    const supabase = db.getClient();
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, plan, email_verified, created_at, updated_at, last_login_at, preferences, subscription_id, subscription_status')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      logger.warn(`Authentication failed for user ${decoded.userId}: User not found`);
      throw new AuthenticationError('Invalid token - user not found');
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      subscriptionId: user.subscription_id,
      subscriptionStatus: user.subscription_status,
      emailVerified: user.email_verified,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLoginAt: user.last_login_at,
      preferences: user.preferences || {},
    };

    logger.debug(`User authenticated: ${user.email} (${user.id})`);
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn(`JWT verification failed: ${error.message}`);
      return next(new AuthenticationError('Invalid token'));
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn(`JWT token expired: ${error.message}`);
      return next(new AuthenticationError('Token expired'));
    }

    next(error);
  }
};

/**
 * Optional Authentication Middleware
 * Attaches user if token is valid, but doesn't require it
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next(); // No token, continue without user
    }

    // Try to authenticate, but don't fail if invalid
    await authenticateToken(req, res, next);
  } catch (error) {
    // Log the error but continue without authentication
    logger.debug(`Optional auth failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    next();
  }
};

/**
 * Email Verification Middleware
 * Requires user to have verified email
 */
export const requireEmailVerification = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    return next(new AuthenticationError('Authentication required'));
  }

  if (!req.user.emailVerified) {
    return next(new AuthorizationError('Email verification required'));
  }

  next();
};

/**
 * Pro Plan Middleware
 * Requires user to have Pro plan
 */
export const requireProPlan = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    return next(new AuthenticationError('Authentication required'));
  }

  if (req.user.plan !== 'pro') {
    return next(new AuthorizationError('Pro plan required for this feature'));
  }

  next();
};

/**
 * Admin Middleware (for future use)
 * Requires user to have admin role
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    return next(new AuthenticationError('Authentication required'));
  }

  // For now, check if user email is admin (you can extend this)
  const adminEmails = ['admin@ainotes.com']; // Add your admin emails
  
  if (!adminEmails.includes(req.user.email)) {
    return next(new AuthorizationError('Admin access required'));
  }

  next();
};

/**
 * Refresh Token Middleware
 * Verifies refresh token for token refresh endpoint
 */
export const authenticateRefreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AuthenticationError('Refresh token required');
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, jwtConfig.refreshSecret) as any;
    
    if (decoded.type !== 'refresh') {
      throw new AuthenticationError('Invalid token type');
    }

    // Check if refresh token exists in database
    const supabase = db.getClient();
    const { data: session, error } = await supabase
      .from('sessions')
      .select('id, user_id, expires_at')
      .eq('refresh_token', refreshToken)
      .eq('user_id', decoded.userId)
      .single();

    if (error || !session) {
      logger.warn(`Refresh token not found in database for user ${decoded.userId}`);
      throw new AuthenticationError('Invalid refresh token');
    }

    // Check if token is expired
    if (new Date(session.expires_at) < new Date()) {
      logger.warn(`Refresh token expired for user ${decoded.userId}`);
      throw new AuthenticationError('Refresh token expired');
    }

    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, plan, email_verified, created_at, updated_at, last_login_at, preferences, subscription_id, subscription_status')
      .eq('id', decoded.userId)
      .single();

    if (userError || !user) {
      throw new AuthenticationError('User not found');
    }

    // Attach user and session to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      subscriptionId: user.subscription_id,
      subscriptionStatus: user.subscription_status,
      emailVerified: user.email_verified,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLoginAt: user.last_login_at,
      preferences: user.preferences || {},
    };

    (req as any).session = session;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AuthenticationError('Invalid refresh token'));
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AuthenticationError('Refresh token expired'));
    }

    next(error);
  }
};