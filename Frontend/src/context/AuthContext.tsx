import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User } from '@/types';
import { authService } from '@/services/authService';
import { TokenManager } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithTokens: (user: User, tokens: { accessToken: string; refreshToken: string }) => void;
  register: (email: string, password: string, name: string) => Promise<{ requiresVerification: boolean; email?: string }>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already authenticated on app start
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const accessToken = TokenManager.getAccessToken();
        const refreshToken = TokenManager.getRefreshToken();
        
        if (accessToken && refreshToken) {
          // Try to get current user with existing token
          try {
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);
            console.log('User authenticated successfully on app start');
          } catch (error: any) {
            console.warn('Failed to get current user with existing token:', error);
            
            // If it's a 401 error, try to refresh the token
            if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
              console.log('Attempting to refresh token...');
              try {
                const newToken = await authService.refreshToken();
                if (newToken) {
                  // Try again with refreshed token
                  const currentUser = await authService.getCurrentUser();
                  setUser(currentUser);
                  console.log('User authenticated successfully after token refresh');
                } else {
                  console.warn('Token refresh failed, clearing tokens');
                  TokenManager.clearTokens();
                }
              } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
                TokenManager.clearTokens();
              }
            } else {
              // For other errors, clear tokens
              TokenManager.clearTokens();
            }
          }
        } else {
          console.log('No tokens found, user not authenticated');
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        TokenManager.clearTokens();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const authResponse = await authService.login({ email, password });
      setUser(authResponse.user);
    } catch (error: any) {
      console.error('Login failed:', error);
      // Check if it's an email verification error
      if (error.response?.data?.error?.code === 'EMAIL_NOT_VERIFIED') {
        // Re-throw with additional context for the UI to handle
        const verificationError = new Error('Email not verified');
        (verificationError as any).code = 'EMAIL_NOT_VERIFIED';
        (verificationError as any).email = error.response.data.data?.email;
        (verificationError as any).canResend = error.response.data.data?.canResend;
        throw verificationError;
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithTokens = useCallback((user: User, tokens: { accessToken: string; refreshToken: string }) => {
    TokenManager.setTokens(tokens.accessToken, tokens.refreshToken);
    setUser(user);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      // The register endpoint returns a success message and requires verification
      const response = await authService.register({ email, password, name });
      
      // If we get here, registration was successful but requires verification
      return { requiresVerification: true, email: email.toLowerCase() };
    } catch (error: any) {
      console.error('Registration failed:', error);
      
      // Check if it's a successful registration that requires verification
      if (error.response?.status === 201 && error.response?.data?.success) {
        return { requiresVerification: true, email: error.response.data.data?.email || email.toLowerCase() };
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyEmail = useCallback(async (email: string, code: string) => {
    setIsLoading(true);
    try {
      const authResponse = await authService.verifyEmail({ email, code });
      setUser(authResponse.user);
    } catch (error) {
      console.error('Email verification failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    try {
      await authService.resendVerification({ email });
    } catch (error) {
      console.error('Resend verification failed:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear user state even if logout call fails
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!user) return;
    
    try {
      const updatedUser = await authService.updateProfile(updates);
      setUser(updatedUser);
    } catch (error) {
      console.error('Update user failed:', error);
      throw error;
    }
  }, [user]);

  const clearAuth = useCallback(() => {
    TokenManager.clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginWithTokens,
        register,
        logout,
        updateUser,
        verifyEmail,
        resendVerification,
        clearAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
