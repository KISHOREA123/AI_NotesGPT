import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { TokenManager } from '@/lib/api';

export default function GoogleAuthSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithTokens } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const handleGoogleAuthSuccess = async () => {
      try {
        const token = searchParams.get('token');
        const refreshToken = searchParams.get('refresh');
        const error = searchParams.get('error');

        if (error) {
          throw new Error(error === 'google_auth_failed' ? 'Google authentication failed' : error);
        }

        if (!token || !refreshToken) {
          throw new Error('Missing authentication tokens');
        }

        // Store tokens temporarily
        TokenManager.setTokens(token, refreshToken);

        // Get user profile
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        const response = await fetch(`${apiUrl}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to get user profile');
        }

        const userData = await response.json();
        
        if (!userData.success || !userData.data) {
          throw new Error('Invalid user data received');
        }

        // Login with tokens
        loginWithTokens(userData.data, { accessToken: token, refreshToken });

        toast({
          title: 'Welcome! 🎉',
          description: 'You have successfully signed in with Google.',
        });

        // Redirect to dashboard
        navigate('/dashboard');
      } catch (error: any) {
        console.error('Google auth success handler error:', error);
        
        // Clear any stored tokens
        TokenManager.clearTokens();
        
        toast({
          title: 'Authentication Failed',
          description: error.message || 'Failed to complete Google sign-in',
          variant: 'destructive',
        });

        // Redirect to login with error
        navigate('/login?error=google_auth_failed');
      }
    };

    handleGoogleAuthSuccess();
  }, [searchParams, navigate, loginWithTokens, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Completing Sign-In
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Please wait while we complete your Google sign-in...
            </p>
          </div>
        </CardHeader>

        <CardContent className="text-center">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <span className="text-sm text-blue-800">Google authentication successful</span>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="h-5 w-5 text-yellow-600 animate-spin" />
                <span className="text-sm text-yellow-800">Setting up your account...</span>
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={() => navigate('/login')}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Having trouble? Go back to login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}