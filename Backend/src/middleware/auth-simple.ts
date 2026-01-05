import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '@/services/database';
import { logger } from '@/utils/logger';
import { DatabaseUser, User, mapDatabaseUserToUser } from '@/types';

// Extend Request interface
interface AuthenticatedRequest extends Request {
  user?: User;
}

// Simple auth middleware without strict typing
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Access token required',
        },
      });
    }

    // Verify JWT token
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    if (decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token type',
        },
      });
    }

    // Get user from database
    const supabase = db.getClient();
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      logger.warn(`Authentication failed for user ${decoded.userId}: User not found`);
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token - user not found',
        },
      });
    }

    // Attach user to request
    req.user = mapDatabaseUserToUser(user as DatabaseUser);

    logger.debug(`User authenticated: ${req.user.email} (${req.user.id})`);
    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      logger.warn(`JWT verification failed: ${error.message}`);
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token',
        },
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      logger.warn(`JWT token expired: ${error.message}`);
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token expired',
        },
      });
    }

    logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication failed',
      },
    });
  }
};

export const requireEmailVerification = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required',
      },
    });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'EMAIL_VERIFICATION_REQUIRED',
        message: 'Email verification required',
      },
    });
  }

  next();
};

export const requireProPlan = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required',
      },
    });
  }

  if (req.user.plan !== 'pro') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'PRO_PLAN_REQUIRED',
        message: 'Pro plan required for this feature',
      },
    });
  }

  next();
};