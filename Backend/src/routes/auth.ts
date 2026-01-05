import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { authRateLimiter } from '@/middleware/rateLimiter';
import { asyncHandler } from '@/middleware/errorHandler';
import { authenticateToken } from '@/middleware/auth-simple';
import { db } from '@/services/database';
import { emailService } from '@/services/email';
import { verificationService } from '@/services/verification';
import { googleAuthService } from '@/services/googleAuth';
import { jwt as jwtConfig } from '@/config';
import { logger } from '@/utils/logger';
import { DatabaseUser, User, mapDatabaseUserToUser } from '@/types';

const router = Router();

// Extend Request interface for authenticated routes
interface AuthenticatedRequest extends Request {
  user: User;
}

// Apply auth-specific rate limiting
router.use(authRateLimiter);

/**
 * Generate JWT tokens
 */
function generateTokens(userId: string) {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn }
  );
  
  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    jwtConfig.refreshSecret,
    { expiresIn: jwtConfig.refreshExpiresIn }
  );
  
  return { accessToken, refreshToken };
}

/**
 * User registration with email verification
 * POST /api/auth/register
 */
router.post('/register', asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;
  
  // Basic validation
  if (!email || !password || !name) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email, password, and name are required',
      },
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid email format',
      },
    });
  }

  // Validate password strength
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Password must be at least 6 characters long',
      },
    });
  }

  try {
    const supabase = db.getClient();
    
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email_verified')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      if (existingUser.email_verified) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'User with this email already exists',
          },
        });
      } else {
        // User exists but not verified, allow re-registration
        logger.info(`Re-registration attempt for unverified user: ${email}`);
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create or update user (unverified)
    const { data: newUser, error } = await supabase
      .from('users')
      .upsert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        name: name.trim(),
        plan: 'free',
        email_verified: false,
      })
      .select()
      .single();

    if (error) {
      logger.error('User registration failed:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: 'Failed to create user account',
        },
      });
    }

    // Generate verification code
    const verificationCode = await verificationService.createEmailVerification(email.toLowerCase());
    
    // Send verification email
    const emailSent = await emailService.sendVerificationEmail(email, verificationCode, name);
    
    if (!emailSent) {
      logger.warn(`Failed to send verification email to ${email}, but user created`);
    }

    logger.info(`User registered successfully (pending verification): ${email}`);

    res.status(201).json({
      success: true,
      data: {
        message: 'Registration successful! Please check your email for verification code.',
        email: email.toLowerCase(),
        verificationRequired: true,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
}));

/**
 * Verify email with code
 * POST /api/auth/verify-email
 */
router.post('/verify-email', asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  
  if (!email || !code) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email and verification code are required',
      },
    });
  }

  try {
    // Verify the code
    const isValid = await verificationService.verifyEmailCode(email.toLowerCase(), code);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CODE',
          message: 'Invalid or expired verification code',
        },
      });
    }

    const supabase = db.getClient();
    
    // Update user as verified
    const { data: user, error } = await supabase
      .from('users')
      .update({ 
        email_verified: true,
        updated_at: new Date().toISOString()
      })
      .eq('email', email.toLowerCase())
      .select()
      .single();

    if (error || !user) {
      logger.error('Failed to update user verification status:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'VERIFICATION_FAILED',
          message: 'Failed to verify email',
        },
      });
    }

    // Generate tokens for the verified user
    const tokens = generateTokens(user.id);

    // Store refresh token
    await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        refresh_token: tokens.refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        ip_address: req.ip,
        device_info: {
          userAgent: req.get('User-Agent'),
        },
      });

    // Send welcome email
    await emailService.sendWelcomeEmail(user.email, user.name);

    // Return user data
    const userData = {
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
      preferences: user.preferences,
    };

    logger.info(`Email verified successfully: ${email}`);

    res.json({
      success: true,
      data: {
        user: userData,
        tokens,
        message: 'Email verified successfully! Welcome to AI Notes.',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
}));

/**
 * Resend verification code
 * POST /api/auth/resend-verification
 */
router.post('/resend-verification', asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email is required',
      },
    });
  }

  try {
    const supabase = db.getClient();
    
    // Check if user exists and is not verified
    const { data: user } = await supabase
      .from('users')
      .select('id, name, email_verified')
      .eq('email', email.toLowerCase())
      .single();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'No account found with this email',
        },
      });
    }

    if (user.email_verified) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_VERIFIED',
          message: 'Email is already verified',
        },
      });
    }

    // Try to resend verification code
    const result = await verificationService.resendVerificationCode(email.toLowerCase());
    
    if (!result.success) {
      if (result.waitTime) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: `Please wait ${result.waitTime} seconds before requesting another code`,
          },
        });
      }
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'RESEND_FAILED',
          message: 'Failed to resend verification code',
        },
      });
    }

    // Send new verification email
    const emailSent = await emailService.sendVerificationEmail(email, result.code!, user.name);
    
    if (!emailSent) {
      logger.warn(`Failed to send verification email to ${email}`);
    }

    logger.info(`Verification code resent to: ${email}`);

    res.json({
      success: true,
      data: {
        message: 'Verification code sent! Please check your email.',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
}));
/**
 * User login
 * POST /api/auth/login
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  logger.info(`Login attempt for email: ${email}`);
  
  // Basic validation
  if (!email || !password) {
    logger.warn(`Login validation failed - missing email or password`);
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required',
      },
    });
  }

  try {
    const supabase = db.getClient();
    
    // Find user by email
    logger.info(`Looking up user: ${email.toLowerCase()}`);
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      logger.warn(`User not found: ${email.toLowerCase()}, error: ${error?.message}`);
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }

    logger.info(`User found: ${user.email}, checking password...`);
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    logger.info(`Password verification result: ${isValidPassword}`);
    
    if (!isValidPassword) {
      logger.warn(`Invalid password for user: ${email}`);
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }

    // Check if email is verified
    if (!user.email_verified) {
      logger.warn(`Login attempt with unverified email: ${email}`);
      
      // Check if user has a pending verification
      const status = await verificationService.getVerificationStatus(email.toLowerCase());
      
      return res.status(403).json({
        success: false,
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Please verify your email before logging in',
        },
        data: {
          email: email.toLowerCase(),
          canResend: status.canResend,
          hasVerification: status.hasVerification,
        },
      });
    }

    // Update last login
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    // Generate tokens
    const tokens = generateTokens(user.id);

    // Store refresh token
    await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        refresh_token: tokens.refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        ip_address: req.ip,
        device_info: {
          userAgent: req.get('User-Agent'),
        },
      });

    // Return user data (without password hash)
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      subscriptionId: user.subscription_id,
      subscriptionStatus: user.subscription_status,
      emailVerified: user.email_verified,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLoginAt: new Date().toISOString(),
      preferences: user.preferences,
    };

    logger.info(`User logged in successfully: ${email}`);

    res.json({
      success: true,
      data: {
        user: userData,
        tokens,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
}));

/**
 * Get current user profile
 * GET /api/auth/me
 */
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  
  try {
    const supabase = db.getClient();
    
    // Get fresh user data from database
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !userData) {
      logger.error(`Failed to fetch user data for ${user.id}:`, error);
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // Update last login time
    await supabase
      .from('users')
      .update({ 
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    // Format user data for response
    const responseData = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      plan: userData.plan,
      subscriptionId: userData.subscription_id,
      subscriptionStatus: userData.subscription_status,
      emailVerified: userData.email_verified,
      createdAt: userData.created_at,
      updatedAt: userData.updated_at,
      lastLoginAt: userData.last_login_at,
      preferences: userData.preferences || {},
    };

    logger.debug(`User profile fetched: ${user.email}`);

    res.json({
      success: true,
      data: {
        user: responseData,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch user profile',
      },
    });
  }
});

/**
 * Update user profile
 * PUT /api/auth/profile
 */
router.put('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const { name, preferences } = req.body;
  
  // Validate input
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Name is required and must be a non-empty string',
      },
    });
  }

  try {
    const supabase = db.getClient();
    
    // Prepare update data
    const updateData: any = {
      name: name.trim(),
      updated_at: new Date().toISOString(),
    };

    // Add preferences if provided
    if (preferences !== undefined) {
      if (typeof preferences !== 'object' || preferences === null) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Preferences must be a valid object',
          },
        });
      }
      updateData.preferences = preferences;
    }

    // Update user profile
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id)
      .select('*')
      .single();

    if (error || !updatedUser) {
      logger.error(`Failed to update user profile for ${user.id}:`, error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update user profile',
        },
      });
    }

    // Format response data
    const responseData = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      plan: updatedUser.plan,
      subscriptionId: updatedUser.subscription_id,
      subscriptionStatus: updatedUser.subscription_status,
      emailVerified: updatedUser.email_verified,
      createdAt: updatedUser.created_at,
      updatedAt: updatedUser.updated_at,
      lastLoginAt: updatedUser.last_login_at,
      preferences: updatedUser.preferences || {},
    };

    logger.info(`User profile updated: ${user.email}`);

    res.json({
      success: true,
      data: {
        user: responseData,
        message: 'Profile updated successfully',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Update user profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update user profile',
      },
    });
  }
});

/**
 * Refresh JWT token
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Refresh token is required',
      },
    });
  }

  try {
    // Verify refresh token
    const decoded: any = jwt.verify(refreshToken, jwtConfig.refreshSecret);
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    const supabase = db.getClient();
    
    // Check if refresh token exists in database
    const { data: session, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('refresh_token', refreshToken)
      .eq('user_id', decoded.userId)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !session) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired refresh token',
        },
      });
    }

    // Generate new tokens
    const tokens = generateTokens(decoded.userId);

    // Update session with new refresh token
    await supabase
      .from('sessions')
      .update({
        refresh_token: tokens.refreshToken,
        last_used_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', session.id);

    logger.debug(`Tokens refreshed for user: ${decoded.userId}`);

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired refresh token',
      },
    });
  }
});

/**
 * User logout
 * POST /api/auth/logout
 */
router.post('/logout', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  
  if (refreshToken) {
    try {
      const supabase = db.getClient();
      
      // Remove refresh token from database
      await supabase
        .from('sessions')
        .delete()
        .eq('refresh_token', refreshToken);
        
      logger.info('User logged out successfully');
    } catch (error) {
      logger.error('Logout error:', error);
    }
  }

  res.json({
    success: true,
    data: null,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
}));

/**
 * Forgot password - send reset link
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email is required',
      },
    });
  }

  try {
    const supabase = db.getClient();
    
    // Check if user exists
    const { data: user } = await supabase
      .from('users')
      .select('id, name, email_verified')
      .eq('email', email.toLowerCase())
      .single();

    // Always return success for security (don't reveal if email exists)
    if (!user) {
      logger.info(`Password reset requested for non-existent email: ${email}`);
      return res.json({
        success: true,
        data: {
          message: 'If an account with this email exists, a password reset link has been sent.',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Check if user's email is verified
    if (!user.email_verified) {
      logger.warn(`Password reset requested for unverified email: ${email}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Please verify your email before requesting password reset',
        },
      });
    }

    // Check if user already has a pending reset
    const hasPendingReset = await verificationService.hasPendingReset(email.toLowerCase());
    if (hasPendingReset) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RESET_PENDING',
          message: 'A password reset link has already been sent. Please check your email or wait before requesting another.',
        },
      });
    }

    // Generate reset token
    const resetToken = await verificationService.createPasswordReset(email.toLowerCase(), user.id);
    
    // Send reset email
    const emailSent = await emailService.sendPasswordResetEmail(email, resetToken, user.name);
    
    if (!emailSent) {
      logger.warn(`Failed to send password reset email to ${email}`);
    }

    logger.info(`Password reset requested for: ${email}`);

    res.json({
      success: true,
      data: {
        message: 'If an account with this email exists, a password reset link has been sent.',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
}));

/**
 * Reset password with token
 * POST /api/auth/reset-password
 */
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  
  if (!token || !password) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Token and password are required',
      },
    });
  }

  // Validate password strength
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Password must be at least 6 characters long',
      },
    });
  }

  try {
    // Verify and consume the reset token
    const tokenResult = await verificationService.consumeResetToken(token);
    
    if (!tokenResult.valid || !tokenResult.email || !tokenResult.userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired reset token',
        },
      });
    }

    const supabase = db.getClient();
    
    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Update user password
    const { error } = await supabase
      .from('users')
      .update({ 
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', tokenResult.userId);

    if (error) {
      logger.error('Failed to update password:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'RESET_FAILED',
          message: 'Failed to reset password',
        },
      });
    }

    // Invalidate all existing sessions for security
    await supabase
      .from('sessions')
      .delete()
      .eq('user_id', tokenResult.userId);

    logger.info(`Password reset successful for: ${tokenResult.email}`);

    res.json({
      success: true,
      data: {
        message: 'Password reset successful! You can now log in with your new password.',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
}));

/**
 * Verify reset token (check if token is valid without consuming it)
 * GET /api/auth/verify-reset-token/:token
 */
router.get('/verify-reset-token/:token', asyncHandler(async (req, res) => {
  const { token } = req.params;
  
  if (!token) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Token is required',
      },
    });
  }

  try {
    const tokenResult = await verificationService.verifyResetToken(token);
    
    res.json({
      success: true,
      data: {
        valid: tokenResult.valid,
        email: tokenResult.valid ? tokenResult.email : undefined,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Verify reset token error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
}));

/**
 * Google OAuth - Initiate authentication
 * GET /api/auth/google
 */
router.get('/google', (req, res, next) => {
  if (!googleAuthService.isGoogleAuthConfigured()) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Google Sign-In is not configured',
      },
    });
  }

  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })(req, res, next);
});

/**
 * Google OAuth - Handle callback
 * GET /api/auth/google/callback
 */
router.get('/google/callback', 
  passport.authenticate('google', { session: false }),
  asyncHandler(async (req, res) => {
    try {
      const user = req.user as any;
      
      if (!user) {
        return res.redirect(`${process.env.APP_URL}/login?error=google_auth_failed`);
      }

      // Generate JWT tokens
      const tokens = generateTokens(user.id);

      // Store refresh token in database
      const supabase = db.getClient();
      await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          refresh_token: tokens.refreshToken,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          ip_address: req.ip,
          device_info: {
            userAgent: req.get('User-Agent'),
            provider: 'google',
          },
        });

      // Redirect to frontend with tokens
      const redirectUrl = `${process.env.APP_URL}/auth/google/success?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`;
      res.redirect(redirectUrl);
    } catch (error) {
      logger.error('Google OAuth callback error:', error);
      res.redirect(`${process.env.APP_URL}/login?error=google_auth_failed`);
    }
  })
);

/**
 * Check Google OAuth configuration status
 * GET /api/auth/google/status
 */
router.get('/google/status', (req, res) => {
  res.json({
    success: true,
    data: {
      available: googleAuthService.isGoogleAuthConfigured(),
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
});

export { router as authRouter };