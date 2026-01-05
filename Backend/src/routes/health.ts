import { Router, Request, Response } from 'express';
import { db } from '@/services/database';
import { cache } from '@/services/cache';
import { logger } from '@/utils/logger';
import { HealthResponse } from '@/types';

const router = Router();

/**
 * Health check endpoint
 * GET /health
 */
router.get('/', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Check all services
    const [databaseHealth, cacheHealth] = await Promise.allSettled([
      checkDatabaseHealth(),
      checkCacheHealth(),
    ]);

    // Determine overall status
    const services = {
      database: databaseHealth.status === 'fulfilled' && databaseHealth.value ? 'healthy' : 'unhealthy',
      redis: cacheHealth.status === 'fulfilled' && cacheHealth.value ? 'healthy' : 'unhealthy',
      ai_service: 'healthy', // We'll implement this when we add AI services
      storage: 'healthy', // We'll implement this when we add file storage
    } as const;

    const unhealthyServices = Object.values(services).filter(status => status === 'unhealthy');
    const overallStatus = unhealthyServices.length === 0 
      ? 'healthy' 
      : unhealthyServices.length >= 2 
        ? 'unhealthy' 
        : 'degraded';

    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services,
      version: '1.0.0',
      uptime: process.uptime(),
    };

    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    
    // Log health check
    logger.info('Health check completed', {
      status: overallStatus,
      responseTime: Date.now() - startTime,
      services,
    });

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error('Health check failed:', error);
    
    const response: HealthResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'unhealthy',
        redis: 'unhealthy',
        ai_service: 'unhealthy',
        storage: 'unhealthy',
      },
      version: '1.0.0',
      uptime: process.uptime(),
    };

    res.status(503).json(response);
  }
});

/**
 * Detailed health check endpoint
 * GET /health/detailed
 */
router.get('/detailed', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Get detailed information about each service
    const [
      databaseHealth,
      cacheHealth,
      databaseStats,
      cacheStats,
    ] = await Promise.allSettled([
      checkDatabaseHealth(),
      checkCacheHealth(),
      getDatabaseStats(),
      getCacheStats(),
    ]);

    const response = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      responseTime: Date.now() - startTime,
      services: {
        database: {
          status: databaseHealth.status === 'fulfilled' && databaseHealth.value ? 'healthy' : 'unhealthy',
          stats: databaseStats.status === 'fulfilled' ? databaseStats.value : null,
          error: databaseHealth.status === 'rejected' ? databaseHealth.reason?.message : null,
        },
        cache: {
          status: cacheHealth.status === 'fulfilled' && cacheHealth.value ? 'healthy' : 'unhealthy',
          stats: cacheStats.status === 'fulfilled' ? cacheStats.value : null,
          error: cacheHealth.status === 'rejected' ? cacheHealth.reason?.message : null,
        },
        ai_service: {
          status: 'healthy',
          stats: null, // TODO: Implement AI service stats
        },
        storage: {
          status: 'healthy',
          stats: null, // TODO: Implement storage stats
        },
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
        },
        cpu: process.cpuUsage(),
      },
    };

    res.json(response);
  } catch (error) {
    logger.error('Detailed health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Readiness probe endpoint
 * GET /health/ready
 */
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    // Check if all critical services are ready
    const [databaseReady, cacheReady] = await Promise.all([
      checkDatabaseHealth(),
      checkCacheHealth(),
    ]);

    if (databaseReady && cacheReady) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        services: {
          database: databaseReady,
          cache: cacheReady,
        },
      });
    }
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Liveness probe endpoint
 * GET /health/live
 */
router.get('/live', (_req: Request, res: Response) => {
  // Simple liveness check - if the process is running, it's alive
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Check database health
 */
async function checkDatabaseHealth(): Promise<boolean> {
  try {
    return await db.healthCheck();
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Check cache health
 */
async function checkCacheHealth(): Promise<boolean> {
  try {
    return await cache.healthCheck();
  } catch (error) {
    logger.error('Cache health check failed:', error);
    return false;
  }
}

/**
 * Get database statistics
 */
async function getDatabaseStats(): Promise<unknown> {
  try {
    const [stats, size] = await Promise.all([
      db.getStats(),
      db.getDatabaseSize(),
    ]);

    return {
      ...stats,
      size,
    };
  } catch (error) {
    logger.error('Failed to get database stats:', error);
    return null;
  }
}

/**
 * Get cache statistics
 */
async function getCacheStats(): Promise<unknown> {
  try {
    return await cache.getStats();
  } catch (error) {
    logger.error('Failed to get cache stats:', error);
    return null;
  }
}

export { router as healthRouter };
