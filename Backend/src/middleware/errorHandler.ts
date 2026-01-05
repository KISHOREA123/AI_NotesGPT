import { Request, Response, NextFunction } from 'express';
import { logError } from '@/utils/logger';
import { ApiError } from '@/types';

/**
 * Custom error class for API errors
 */
export class AppError extends Error implements ApiError {
  public statusCode: number;
  public code: string;
  public details?: unknown;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_SERVER_ERROR',
    details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error class
 */
export class ValidationError extends AppError {
  public field: string;
  public value: unknown;

  constructor(message: string, field: string, value: unknown) {
    super(message, 400, 'VALIDATION_ERROR', { field, value });
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

/**
 * Authentication error class
 */
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_REQUIRED');
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error class
 */
export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'INSUFFICIENT_PERMISSIONS');
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'RESOURCE_NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error class
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'RESOURCE_CONFLICT');
    this.name = 'ConflictError';
  }
}

/**
 * Rate limit error class
 */
export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

/**
 * Service unavailable error class
 */
export class ServiceUnavailableError extends AppError {
  constructor(service = 'Service') {
    super(`${service} is currently unavailable`, 503, 'SERVICE_UNAVAILABLE');
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Convert Joi validation errors to ValidationError
 */
function handleJoiError(error: any): ValidationError {
  const details = error.details?.[0];
  const field = details?.path?.join('.') || 'unknown';
  const value = details?.context?.value;
  const message = details?.message || 'Validation failed';

  return new ValidationError(message, field, value);
}

/**
 * Convert Supabase errors to appropriate AppError
 */
function handleSupabaseError(error: any): AppError {
  const message = error.message || 'Database operation failed';
  const code = error.code;

  switch (code) {
    case '23505': // Unique violation
      return new ConflictError('Resource already exists');
    case '23503': // Foreign key violation
      return new ValidationError('Invalid reference', 'foreign_key', null);
    case '23502': // Not null violation
      return new ValidationError('Required field missing', 'not_null', null);
    case 'PGRST116': // Row not found
      return new NotFoundError();
    default:
      return new AppError(message, 500, 'DATABASE_ERROR', { code });
  }
}

/**
 * Convert unknown errors to AppError
 */
function handleUnknownError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error && typeof error === 'object') {
    const err = error as any;

    // Handle Joi validation errors
    if (err.isJoi) {
      return handleJoiError(err);
    }

    // Handle Supabase errors
    if (err.code && typeof err.code === 'string') {
      return handleSupabaseError(err);
    }

    // Handle standard Error objects
    if (err instanceof Error) {
      return new AppError(err.message, 500, 'INTERNAL_SERVER_ERROR');
    }
  }

  // Fallback for unknown error types
  return new AppError('An unexpected error occurred', 500, 'UNKNOWN_ERROR');
}

/**
 * Express error handling middleware
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Convert error to AppError
  const appError = handleUnknownError(error);

  // Log error details
  logError('Request error', appError, {
    requestId: res.locals['requestId'],
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: (req as any).user?.id,
  });

  // Send error response
  res.status(appError.statusCode).json({
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: res.locals['requestId'],
    },
  });
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: T, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create error response helper
 */
export function createErrorResponse(
  error: AppError,
  requestId?: string
): {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: {
    timestamp: string;
    requestId?: string;
  };
} {
  const meta: { timestamp: string; requestId?: string } = {
    timestamp: new Date().toISOString(),
  };
  
  if (requestId) {
    meta.requestId = requestId;
  }

  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
    meta,
  };
}

/**
 * Create success response helper
 */
export function createSuccessResponse<T = unknown>(
  data: T,
  requestId?: string
): {
  success: true;
  data: T;
  meta: {
    timestamp: string;
    requestId?: string;
  };
} {
  const meta: { timestamp: string; requestId?: string } = {
    timestamp: new Date().toISOString(),
  };
  
  if (requestId) {
    meta.requestId = requestId;
  }

  return {
    success: true,
    data,
    meta,
  };
}