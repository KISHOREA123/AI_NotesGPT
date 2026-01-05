import { cache } from '@/services/cache';
import { logger } from '@/utils/logger';

interface VerificationData {
  code: string;
  email: string;
  userId?: string;
  expiresAt: number;
  attempts: number;
}

interface VerificationStatus {
  hasVerification: boolean;
  expiresIn?: number;
  canResend: boolean;
}

interface ResetTokenResult {
  valid: boolean;
  email?: string;
  userId?: string;
}

class VerificationService {
  private readonly VERIFICATION_EXPIRY = 10 * 60 * 1000; // 10 minutes
  private readonly RESET_EXPIRY = 60 * 60 * 1000; // 1 hour
  private readonly MAX_ATTEMPTS = 5;
  private readonly RESEND_COOLDOWN = 60 * 1000; // 1 minute

  /**
   * Create email verification code
   */
  async createEmailVerification(email: string): Promise<string> {
    try {
      const code = this.generateVerificationCode();
      const expiresAt = Date.now() + this.VERIFICATION_EXPIRY;

      const verificationData: VerificationData = {
        code,
        email: email.toLowerCase(),
        expiresAt,
        attempts: 0,
      };

      await cache.set(
        `verification:${email.toLowerCase()}`,
        JSON.stringify(verificationData),
        Math.floor(this.VERIFICATION_EXPIRY / 1000)
      );

      // Track last attempt time for rate limiting
      await cache.set(
        `verification_attempt:${email.toLowerCase()}`,
        Date.now().toString(),
        Math.floor(this.RESEND_COOLDOWN / 1000)
      );

      logger.info(`Email verification created for: ${email}`);
      return code;
    } catch (error) {
      logger.error('Failed to create email verification:', error);
      throw new Error('Failed to create verification code');
    }
  }

  /**
   * Verify email code
   */
  async verifyEmailCode(email: string, code: string): Promise<boolean> {
    try {
      const cachedData = await cache.get(`verification:${email.toLowerCase()}`);
      
      if (!cachedData) {
        logger.warn(`No verification found for email: ${email}`);
        return false;
      }

      const verificationData: VerificationData = JSON.parse(cachedData as string);

      // Check if expired
      if (Date.now() > verificationData.expiresAt) {
        logger.warn(`Verification expired for email: ${email}`);
        await cache.del(`verification:${email.toLowerCase()}`);
        return false;
      }

      // Check attempts
      if (verificationData.attempts >= this.MAX_ATTEMPTS) {
        logger.warn(`Too many verification attempts for email: ${email}`);
        await cache.del(`verification:${email.toLowerCase()}`);
        return false;
      }

      // Check code
      if (verificationData.code !== code.trim()) {
        // Increment attempts
        verificationData.attempts += 1;
        await cache.set(
          `verification:${email.toLowerCase()}`,
          JSON.stringify(verificationData),
          Math.floor((verificationData.expiresAt - Date.now()) / 1000)
        );
        
        logger.warn(`Invalid verification code for email: ${email}`);
        return false;
      }

      // Success - remove verification data
      await cache.del(`verification:${email.toLowerCase()}`);
      logger.info(`Email verification successful for: ${email}`);
      return true;
    } catch (error) {
      logger.error('Failed to verify email code:', error);
      return false;
    }
  }

  /**
   * Create password reset token
   */
  async createPasswordReset(email: string, userId: string): Promise<string> {
    try {
      const token = this.generateResetToken();
      const expiresAt = Date.now() + this.RESET_EXPIRY;

      const resetData: VerificationData = {
        code: token,
        email: email.toLowerCase(),
        userId,
        expiresAt,
        attempts: 0,
      };

      await cache.set(
        `reset:${token}`,
        JSON.stringify(resetData),
        Math.floor(this.RESET_EXPIRY / 1000)
      );

      // Track pending reset for rate limiting
      await cache.set(
        `reset_pending:${email.toLowerCase()}`,
        'true',
        Math.floor(this.RESET_EXPIRY / 1000)
      );

      logger.info(`Password reset created for: ${email}`);
      return token;
    } catch (error) {
      logger.error('Failed to create password reset:', error);
      throw new Error('Failed to create reset token');
    }
  }

  /**
   * Verify reset token without consuming it
   */
  async verifyResetToken(token: string): Promise<ResetTokenResult> {
    try {
      const cachedData = await cache.get(`reset:${token}`);
      
      if (!cachedData) {
        return { valid: false };
      }

      const resetData: VerificationData = JSON.parse(cachedData as string);

      // Check if expired
      if (Date.now() > resetData.expiresAt) {
        await cache.del(`reset:${token}`);
        return { valid: false };
      }

      return {
        valid: true,
        email: resetData.email,
        userId: resetData.userId,
      };
    } catch (error) {
      logger.error('Failed to verify reset token:', error);
      return { valid: false };
    }
  }

  /**
   * Consume reset token (use it once)
   */
  async consumeResetToken(token: string): Promise<ResetTokenResult> {
    try {
      const result = await this.verifyResetToken(token);
      
      if (result.valid) {
        // Remove the token so it can't be used again
        await cache.del(`reset:${token}`);
        if (result.email) {
          await cache.del(`reset_pending:${result.email}`);
        }
        logger.info(`Reset token consumed: ${token}`);
      }

      return result;
    } catch (error) {
      logger.error('Failed to consume reset token:', error);
      return { valid: false };
    }
  }

  /**
   * Check if user has pending password reset
   */
  async hasPendingReset(email: string): Promise<boolean> {
    try {
      const pending = await cache.get(`reset_pending:${email.toLowerCase()}`);
      return !!pending;
    } catch (error) {
      logger.error('Failed to check pending reset:', error);
      return false;
    }
  }

  /**
   * Resend verification code with rate limiting
   */
  async resendVerificationCode(email: string): Promise<{ success: boolean; code?: string; waitTime?: number }> {
    try {
      // Check rate limiting
      const lastAttempt = await cache.get(`verification_attempt:${email.toLowerCase()}`);
      
      if (lastAttempt) {
        const waitTime = 60 - Math.floor((Date.now() - parseInt(lastAttempt as string)) / 1000);
        if (waitTime > 0) {
          return { success: false, waitTime };
        }
      }

      // Check if there's an existing verification
      const existingData = await cache.get(`verification:${email.toLowerCase()}`);
      if (existingData) {
        const verificationData: VerificationData = JSON.parse(existingData as string);
        
        // If not expired, return existing code
        if (Date.now() < verificationData.expiresAt) {
          return { success: true, code: verificationData.code };
        }
      }

      // Create new verification
      const code = await this.createEmailVerification(email);
      return { success: true, code };
    } catch (error) {
      logger.error('Failed to resend verification code:', error);
      return { success: false };
    }
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(email: string): Promise<VerificationStatus> {
    try {
      const verificationData = await cache.get(`verification:${email.toLowerCase()}`);
      const lastAttempt = await cache.get(`verification_attempt:${email.toLowerCase()}`);
      
      if (!verificationData) {
        return { hasVerification: false, canResend: true };
      }

      const data: VerificationData = JSON.parse(verificationData as string);
      const expiresIn = Math.max(0, data.expiresAt - Date.now());
      const canResend = !lastAttempt || (Date.now() - parseInt(lastAttempt as string)) > 60000;

      return { hasVerification: true, expiresIn, canResend };
    } catch (error) {
      logger.error('Failed to get verification status:', error);
      return { hasVerification: false, canResend: true };
    }
  }

  /**
   * Generate 6-digit verification code
   */
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate secure reset token
   */
  private generateResetToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }
}

// Export singleton instance
export const verificationService = new VerificationService();