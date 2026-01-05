import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import passport from 'passport';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { app as appConfig, features } from '@/config';
import { logger, logError } from '@/utils/logger';
import { errorHandler } from '@/middleware/errorHandler';
import { requestLogger } from '@/middleware/requestLogger';
import { rateLimiter } from '@/middleware/rateLimiter';
import { healthRouter } from '@/routes/health';
import { authRouter } from '@/routes/auth';
import { notesRouter } from '@/routes/notes-simple';
import { aiRouter } from '@/routes/ai';
import { filesRouter } from '@/routes/files';
import { setupSocketIO } from '@/services/socketio';
import { googleAuthService } from '@/services/googleAuth';

// Create Express application
const app = express();

// Create HTTP server
const server = createServer(app);

// Create Socket.IO server if real-time features are enabled
let io: SocketIOServer | undefined;
if (features.realTime) {
  io = new SocketIOServer(server, {
    cors: {
      origin: appConfig.url,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });
  
  // Setup Socket.IO handlers
  setupSocketIO(io);
}

// Trust proxy (important for rate limiting and IP detection)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      appConfig.url,
      'http://localhost:3000',
      'http://localhost:8080',  // Add port 8080 for Vite dev server
      'http://localhost:5173',
      'https://localhost:3000',
      'https://localhost:8080',  // Add HTTPS version too
      'https://localhost:5173',
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma',
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
}));

// Compression middleware
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024, // Only compress responses larger than 1KB
}));

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, _res, buf) => {
    // Store raw body for webhook verification if needed
    (req as any).rawBody = buf;
  },
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Passport
app.use(passport.initialize());

// Initialize Google Auth service (this sets up the passport strategy)
googleAuthService;

// Request logging middleware
app.use(requestLogger);

// Rate limiting middleware
app.use(rateLimiter);

// Health check endpoint (before other routes)
app.use('/health', healthRouter);

// API routes
const apiRouter = express.Router();

// Authentication routes
apiRouter.use('/auth', authRouter);

// Protected routes (require authentication)
apiRouter.use('/notes', notesRouter);

// AI routes (if enabled)
if (features.aiFeatures) {
  apiRouter.use('/ai', aiRouter);
}

// File routes (if enabled)
if (features.fileUploads) {
  apiRouter.use('/files', filesRouter);
}

// Mount API router
app.use('/api', apiRouter);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: appConfig.name,
    version: '1.0.0',
    environment: appConfig.env,
    status: 'running',
    timestamp: new Date().toISOString(),
    features: {
      aiFeatures: features.aiFeatures,
      fileUploads: features.fileUploads,
      realTime: features.realTime,
      emailNotifications: features.emailNotifications,
    },
  });
});

// API documentation endpoint
app.get('/api', (_req, res) => {
  res.json({
    name: `${appConfig.name} API`,
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      notes: '/api/notes',
      ai: features.aiFeatures ? '/api/ai' : 'disabled',
      files: features.fileUploads ? '/api/files' : 'disabled',
    },
    websocket: features.realTime ? 'enabled' : 'disabled',
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ENDPOINT_NOT_FOUND',
      message: 'API endpoint not found',
      details: {
        method: req.method,
        path: req.path,
      },
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: res.locals['requestId'],
    },
  });
});

// 404 handler for all other routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'Route not found',
      details: {
        method: req.method,
        path: req.path,
      },
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: res.locals['requestId'],
    },
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown handling
const gracefulShutdown = (signal: string): void => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close((err) => {
    if (err) {
      logError('Error during server shutdown', err);
      process.exit(1);
    }
    
    logger.info('Server closed successfully');
    
    // Close Socket.IO server
    if (io) {
      io.close(() => {
        logger.info('Socket.IO server closed');
      });
    }
    
    // Close database connections and other cleanup
    // This will be handled by the main index.ts file
    
    process.exit(0);
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logError('Uncaught Exception', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logError('Unhandled Rejection', reason, { promise });
  process.exit(1);
});

export { app, server, io };