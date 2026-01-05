import { apiClient, TokenManager, ApiResponse } from '@/lib/api';
import { User } from '@/types';

// Auth request/response types
interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

interface AuthResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

interface ForgotPasswordRequest {
  email: string;
}

interface ResetPasswordRequest {
  token: string;
  password: string;
}

interface VerifyEmailRequest {
  email: string;
  code: string;
}

interface ResendVerificationRequest {
  email: string;
}

class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<{ requiresVerification: boolean; email: string }> {
    try {
      const response = await apiClient.post('/auth/register', data);
      
      if (response.success) {
        // Registration successful, requires email verification
        return { 
          requiresVerification: true, 
          email: response.data?.email || data.email.toLowerCase() 
        };
      }
      
      throw new Error(response.error?.message || 'Registration failed');
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', data);
      
      if (response.success && response.data) {
        // Store tokens
        TokenManager.setTokens(
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken
        );
        
        return response.data;
      }
      
      throw new Error(response.error?.message || 'Login failed');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      const refreshToken = TokenManager.getRefreshToken();
      
      if (refreshToken) {
        // Call logout endpoint to invalidate tokens on server
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with local logout even if server call fails
    } finally {
      // Clear local tokens
      TokenManager.clearTokens();
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get<{ user: User }>('/auth/me');
      
      if (response.success && response.data && response.data.user) {
        return response.data.user;
      }
      
      throw new Error(response.error?.message || 'Failed to get user profile');
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(data: Partial<User>): Promise<User> {
    try {
      const response = await apiClient.put<{ user: User }>('/auth/profile', data);
      
      if (response.success && response.data && response.data.user) {
        return response.data.user;
      }
      
      throw new Error(response.error?.message || 'Failed to update profile');
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async forgotPassword(data: ForgotPasswordRequest): Promise<void> {
    try {
      const response = await apiClient.post('/auth/forgot-password', data);
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(data: ResetPasswordRequest): Promise<void> {
    try {
      const response = await apiClient.post('/auth/reset-password', data);
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }

  /**
   * Verify email with code
   */
  async verifyEmail(data: VerifyEmailRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/verify-email', data);
      
      if (response.success && response.data) {
        // Store tokens
        TokenManager.setTokens(
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken
        );
        
        return response.data;
      }
      
      throw new Error(response.error?.message || 'Email verification failed');
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  }

  /**
   * Resend verification code
   */
  async resendVerification(data: ResendVerificationRequest): Promise<void> {
    try {
      const response = await apiClient.post('/auth/resend-verification', data);
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to resend verification code');
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      throw error;
    }
  }

  /**
   * Verify reset token
   */
  async verifyResetToken(token: string): Promise<{ valid: boolean; email?: string }> {
    try {
      const response = await apiClient.get<{ valid: boolean; email?: string }>(`/auth/verify-reset-token/${token}`);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      return { valid: false };
    } catch (error) {
      console.error('Verify reset token error:', error);
      return { valid: false };
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!TokenManager.getAccessToken();
  }

  /**
   * Clear all authentication data
   */
  clearAuth(): void {
    TokenManager.clearTokens();
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = TokenManager.getRefreshToken();
      
      if (!refreshToken) {
        return null;
      }

      const response = await apiClient.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
        refreshToken,
      });
      
      if (response.success && response.data) {
        TokenManager.setTokens(response.data.accessToken, response.data.refreshToken);
        return response.data.accessToken;
      }
      
      return null;
    } catch (error) {
      console.error('Token refresh error:', error);
      TokenManager.clearTokens();
      return null;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();