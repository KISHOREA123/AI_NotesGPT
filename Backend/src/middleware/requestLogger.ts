import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logRequest } from '@/utils/logger';

/**
 * Request logging middleware
 * Logs HTTP requests and adds request ID for tracing
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Generate unique request ID
  const requestId = uuidv4();
  res.locals['requestId'] = requestId;

  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);

  // Record start time
  const startTime = Date.now();

  // Override res.end to capture response details
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): Response {
    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Get user ID if available
    const userId = (req as any).user?.id;

    // Log the request
    logRequest(
      req.method,
      req.originalUrl,
      res.statusCode,
      responseTime,
      userId,
      {
        requestId,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        contentLength: res.get('Content-Length'),
      }
    );

    // Call original end method
    return originalEnd.call(this, chunk, encoding);
  };

  next();
}