import winston from 'winston';
import { app } from '@/config';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info: any) => `${info['timestamp']} ${info.level}: ${info.message}${info['stack'] ? `\n${info['stack']}` : ''}`
  )
);

// Define production format (structured JSON)
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define which logs to show based on environment
const level = (): string => {
  const env = app.env;
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    level: level(),
    format: app.env === 'production' ? productionFormat : format,
  }),
];

// Add file transports in production
if (app.env === 'production') {
  transports.push(
    // Error log file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: productionFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }) as any,
    // Combined log file
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: productionFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }) as any
  );
}

// Create logger instance
export const logger = winston.createLogger({
  level: level(),
  levels,
  format: app.env === 'production' ? productionFormat : format,
  transports,
  exitOnError: false,
});

// Create a stream object for Morgan HTTP logging
export const loggerStream = {
  write: (message: string): void => {
    logger.http(message.trim());
  },
};

// Helper functions for structured logging
export const logError = (message: string, error?: Error | unknown, meta?: Record<string, unknown>): void => {
  const logData: Record<string, unknown> = {
    message,
    ...meta,
  };

  if (error) {
    if (error instanceof Error) {
      logData['error'] = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else {
      logData['error'] = error;
    }
  }

  logger.error(logData);
};

export const logInfo = (message: string, meta?: Record<string, unknown>): void => {
  logger.info({ message, ...meta });
};

export const logWarn = (message: string, meta?: Record<string, unknown>): void => {
  logger.warn({ message, ...meta });
};

export const logDebug = (message: string, meta?: Record<string, unknown>): void => {
  logger.debug({ message, ...meta });
};

export const logHttp = (message: string, meta?: Record<string, unknown>): void => {
  logger.http({ message, ...meta });
};

// Performance logging helper
export const logPerformance = (
  operation: string,
  startTime: number,
  meta?: Record<string, unknown>
): void => {
  const duration = Date.now() - startTime;
  logger.info({
    message: `Performance: ${operation}`,
    duration: `${duration}ms`,
    ...meta,
  });
};

// Request logging helper
export const logRequest = (
  method: string,
  url: string,
  statusCode: number,
  responseTime: number,
  userId?: string,
  meta?: Record<string, unknown>
): void => {
  logger.http({
    message: 'HTTP Request',
    method,
    url,
    statusCode,
    responseTime: `${responseTime}ms`,
    userId,
    ...meta,
  });
};

// Database operation logging
export const logDatabase = (
  operation: string,
  table: string,
  duration?: number,
  meta?: Record<string, unknown>
): void => {
  logger.debug({
    message: `Database: ${operation}`,
    table,
    duration: duration ? `${duration}ms` : undefined,
    ...meta,
  });
};

// Cache operation logging
export const logCache = (
  operation: 'hit' | 'miss' | 'set' | 'delete',
  key: string,
  meta?: Record<string, unknown>
): void => {
  logger.debug({
    message: `Cache: ${operation}`,
    key,
    ...meta,
  });
};

// AI operation logging
export const logAI = (
  operation: string,
  jobId: string,
  duration?: number,
  meta?: Record<string, unknown>
): void => {
  logger.info({
    message: `AI: ${operation}`,
    jobId,
    duration: duration ? `${duration}ms` : undefined,
    ...meta,
  });
};

// Security event logging
export const logSecurity = (
  event: string,
  userId?: string,
  ip?: string,
  meta?: Record<string, unknown>
): void => {
  logger.warn({
    message: `Security: ${event}`,
    userId,
    ip,
    timestamp: new Date().toISOString(),
    ...meta,
  });
};

// Business metrics logging
export const logMetrics = (
  metric: string,
  value: number | string,
  meta?: Record<string, unknown>
): void => {
  logger.info({
    message: `Metrics: ${metric}`,
    value,
    timestamp: new Date().toISOString(),
    ...meta,
  });
};

// Startup logging
export const logStartup = (message: string, meta?: Record<string, unknown>): void => {
  logger.info({
    message: `Startup: ${message}`,
    environment: app.env,
    port: app.port,
    timestamp: new Date().toISOString(),
    ...meta,
  });
};

// Shutdown logging
export const logShutdown = (message: string, meta?: Record<string, unknown>): void => {
  logger.info({
    message: `Shutdown: ${message}`,
    timestamp: new Date().toISOString(),
    ...meta,
  });
};

// Create logs directory if it doesn't exist (for production)
if (app.env === 'production') {
  import('fs').then(fs => {
    if (!fs.existsSync('logs')) {
      fs.mkdirSync('logs');
    }
  }).catch(error => {
    console.error('Failed to create logs directory:', error);
  });
}