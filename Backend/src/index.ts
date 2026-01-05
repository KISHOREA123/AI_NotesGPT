import { app as appConfig } from '@/config';
import { logger, logStartup, logError } from '@/utils/logger';
import { db } from '@/services/database';
import { cache } from '@/services/cache';
import { app, server } from '@/app';

/**
 * Initialize all services
 */
async function initializeServices(): Promise<void> {
  try {
    logStartup('Initializing services...');

    // Initialize database connection (non-blocking for demo)
    logStartup('Connecting to database...');
    try {
      await db.initialize();
      logStartup('Database connected successfully');
    } catch (error) {
      logStartup('Database connection failed (using placeholder credentials)', { error: error instanceof Error ? error.message : 'Unknown error' });
    }

    // Initialize cache service (non-blocking for demo)
    logStartup('Connecting to cache...');
    try {
      await cache.initialize();
      logStartup('Cache connected successfully');
    } catch (error) {
      logStartup('Cache connection failed (using placeholder credentials)', { error: error instanceof Error ? error.message : 'Unknown error' });
    }

    // TODO: Initialize other services
    // - Email service
    // - AI service
    // - File storage service
    // - Job queue

    logStartup('Service initialization completed (some services may be unavailable with placeholder credentials)');
  } catch (error) {
    logError('Failed to initialize services', error);
    // Don't throw error to allow server to start for demo purposes
    logStartup('Continuing with limited functionality...');
  }
}

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    // Initialize services first
    await initializeServices();

    // Start HTTP server
    server.listen(appConfig.port, () => {
      logStartup(`Server started successfully`, {
        port: appConfig.port,
        environment: appConfig.env,
        url: `${appConfig.apiUrl}`,
      });

      // Log available endpoints
      logStartup('Available endpoints:', {
        health: '/health',
        api: '/api',
        auth: '/api/auth',
        notes: '/api/notes',
        ai: '/api/ai',
        files: '/api/files',
      });

      // Log feature flags
      logStartup('Feature flags:', {
        aiFeatures: process.env['ENABLE_AI_FEATURES'] === 'true',
        fileUploads: process.env['ENABLE_FILE_UPLOADS'] === 'true',
        realTime: process.env['ENABLE_REAL_TIME'] === 'true',
        emailNotifications: process.env['ENABLE_EMAIL_NOTIFICATIONS'] === 'true',
      });

      // Log service information
      logStartup('Service information:', {
        database: 'Supabase PostgreSQL',
        cache: 'Upstash Redis',
        storage: 'Cloudinary',
        email: 'Resend',
        ai: 'Hugging Face + OpenAI',
      });
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      const bind = typeof appConfig.port === 'string' 
        ? `Pipe ${appConfig.port}` 
        : `Port ${appConfig.port}`;

      switch (error.code) {
        case 'EACCES':
          logError(`${bind} requires elevated privileges`);
          process.exit(1);
        case 'EADDRINUSE':
          logError(`${bind} is already in use`);
          process.exit(1);
        default:
          throw error;
      }
    });

  } catch (error) {
    logError('Failed to start server', error);
    process.exit(1);
  }
}

/**
 * Cleanup function for graceful shutdown
 */
async function cleanup(): Promise<void> {
  try {
    logger.info('Starting cleanup process...');

    // Close database connections
    await db.close();
    logger.info('Database connections closed');

    // Note: Cache service (Upstash) doesn't need explicit closing
    logger.info('Cache connections closed');

    logger.info('Cleanup completed successfully');
  } catch (error) {
    logError('Error during cleanup', error);
  }
}

// Handle process termination
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, starting graceful shutdown...');
  await cleanup();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, starting graceful shutdown...');
  await cleanup();
  process.exit(0);
});

// Start the application
if (require.main === module) {
  startServer().catch((error) => {
    logError('Fatal error during startup', error);
    process.exit(1);
  });
}

export { app, server };