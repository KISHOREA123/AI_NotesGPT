import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = z.object({
  // Environment
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3001'),

  // Supabase Configuration
  SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_KEY: z.string().min(1, 'Supabase service key is required'),

  // Upstash Redis Configuration
  UPSTASH_REDIS_REST_URL: z.string().url('Invalid Upstash Redis URL'),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'Upstash Redis token is required'),

  // JWT Configuration
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT refresh secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Cloudinary Configuration
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'Cloudinary cloud name is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'Cloudinary API key is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'Cloudinary API secret is required'),

  // Resend Email Configuration
  RESEND_API_KEY: z.string().min(1, 'Resend API key is required'),
  FROM_EMAIL: z.string().email('Invalid from email address'),

  // Email Service Configuration (Alternative)
  EMAIL_USER: z.string().optional(),
  EMAIL_PASS: z.string().optional(),
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.string().optional(),
  EMAIL_SECURE: z.string().optional(),

  // Google OAuth Configuration
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),

  // AI Configuration
  HUGGINGFACE_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // Sentry Configuration
  SENTRY_DSN: z.string().url().optional(),

  // Application Configuration
  APP_NAME: z.string().default('AI Notes'),
  APP_URL: z.string().url().default('http://localhost:8080'),
  API_URL: z.string().url().default('http://localhost:3001'),

  // Feature Flags
  ENABLE_AI_FEATURES: z.string().transform(val => val === 'true').default('true'),
  ENABLE_FILE_UPLOADS: z.string().transform(val => val === 'true').default('true'),
  ENABLE_REAL_TIME: z.string().transform(val => val === 'true').default('true'),
  ENABLE_EMAIL_NOTIFICATIONS: z.string().transform(val => val === 'true').default('true'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('5'),

  // File Upload Limits
  MAX_FILE_SIZE: z.string().transform(Number).default('10485760'), // 10MB
  MAX_FILES_PER_NOTE: z.string().transform(Number).default('5'),
  ALLOWED_FILE_TYPES: z.string().default('image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain'),

  // AI Configuration
  MAX_AI_REQUESTS_PER_DAY: z.string().transform(Number).default('50'),
  AI_CACHE_TTL_HOURS: z.string().transform(Number).default('24'),

  // Database Configuration
  DB_POOL_MIN: z.string().transform(Number).default('2'),
  DB_POOL_MAX: z.string().transform(Number).default('10'),
  DB_TIMEOUT: z.string().transform(Number).default('30000'),

  // Cache Configuration
  CACHE_TTL_USER_PROFILE: z.string().transform(Number).default('7200'), // 2 hours
  CACHE_TTL_NOTES: z.string().transform(Number).default('1800'), // 30 minutes
  CACHE_TTL_AI_RESULTS: z.string().transform(Number).default('172800'), // 48 hours
});

// Validate and parse environment variables
const parseEnv = (): z.infer<typeof envSchema> => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join('\n');
      
      throw new Error(`Environment validation failed:\n${errorMessages}`);
    }
    throw error;
  }
};

// Export validated configuration
export const config = parseEnv();

// Export individual configuration objects
export const database = {
  url: config.SUPABASE_URL,
  anonKey: config.SUPABASE_ANON_KEY,
  serviceKey: config.SUPABASE_SERVICE_KEY,
  poolMin: config.DB_POOL_MIN,
  poolMax: config.DB_POOL_MAX,
  timeout: config.DB_TIMEOUT,
} as const;

export const redis = {
  url: config.UPSTASH_REDIS_REST_URL,
  token: config.UPSTASH_REDIS_REST_TOKEN,
} as const;

export const jwt = {
  secret: config.JWT_SECRET,
  refreshSecret: config.JWT_REFRESH_SECRET,
  expiresIn: config.JWT_EXPIRES_IN,
  refreshExpiresIn: config.JWT_REFRESH_EXPIRES_IN,
} as const;

export const cloudinary = {
  cloudName: config.CLOUDINARY_CLOUD_NAME,
  apiKey: config.CLOUDINARY_API_KEY,
  apiSecret: config.CLOUDINARY_API_SECRET,
} as const;

export const email = {
  apiKey: config.RESEND_API_KEY,
  fromEmail: config.FROM_EMAIL,
} as const;

export const ai = {
  huggingFaceApiKey: config.HUGGINGFACE_API_KEY,
  openaiApiKey: config.OPENAI_API_KEY,
  maxRequestsPerDay: config.MAX_AI_REQUESTS_PER_DAY,
  cacheTtlHours: config.AI_CACHE_TTL_HOURS,
} as const;

export const app = {
  name: config.APP_NAME,
  url: config.APP_URL,
  apiUrl: config.API_URL,
  port: config.PORT,
  env: config.NODE_ENV,
} as const;

export const features = {
  aiFeatures: config.ENABLE_AI_FEATURES,
  fileUploads: config.ENABLE_FILE_UPLOADS,
  realTime: config.ENABLE_REAL_TIME,
  emailNotifications: config.ENABLE_EMAIL_NOTIFICATIONS,
} as const;

export const rateLimiting = {
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  maxRequests: config.RATE_LIMIT_MAX_REQUESTS,
  authMaxRequests: config.AUTH_RATE_LIMIT_MAX_REQUESTS,
} as const;

export const fileUpload = {
  maxSize: config.MAX_FILE_SIZE,
  maxFilesPerNote: config.MAX_FILES_PER_NOTE,
  allowedTypes: config.ALLOWED_FILE_TYPES.split(','),
} as const;

export const cache = {
  ttl: {
    userProfile: config.CACHE_TTL_USER_PROFILE,
    notes: config.CACHE_TTL_NOTES,
    aiResults: config.CACHE_TTL_AI_RESULTS,
  },
} as const;

export const sentry = {
  dsn: config.SENTRY_DSN,
} as const;

// Type exports
export type Config = typeof config;
export type Environment = typeof config.NODE_ENV;