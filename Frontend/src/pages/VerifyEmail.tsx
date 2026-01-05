import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loginWithTokens, resendVerification } = useAuth();

  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [email, setEmail] = useState(searchParams.get('email') || '');

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendCountdown]);

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !verificationCode) {
      toast({
        title: 'Missing Information',
        description: 'Please enter your email and verification code',
        variant: 'destructive',
      });
      return;
    }

    if (verificationCode.length !== 6) {
      toast({
        title: 'Invalid Code',
        description: 'Verification code must be 6 digits',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);

    try {
      const response = await apiClient.post('/auth/verify-email', {
        email: email.toLowerCase(),
        code: verificationCode,
      });

      if (response.success && response.data) {
        // Auto-login the user after successful verification
        loginWithTokens(response.data.user, response.data.tokens);
        
        toast({
          title: 'Email Verified! 🎉',
          description: response.data.message || 'Welcome to AI Notes!',
        });

        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        throw new Error(response.error?.message || 'Verification failed');
      }
    } catch (error: any) {
      console.error('Email verification error:', error);
      
      let errorMessage = 'Verification failed. Please try again.';
      
      if (error.response?.data?.error?.code === 'INVALID_CODE') {
        errorMessage = 'Invalid or expired verification code. Please check your email or request a new code.';
      }
      
      toast({
        title: 'Verification Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      toast({
        title: 'Email Required',
        description: 'Please enter your email address',
        variant: 'destructive',
      });
      return;
    }

    setIsResending(true);

    try {
      await resendVerification(email.toLowerCase());
      
      toast({
        title: 'Code Sent! 📧',
        description: 'A new verification code has been sent to your email',
      });

      setCanResend(false);
      setResendCountdown(60); // 1 minute cooldown
      setVerificationCode(''); // Clear current code
    } catch (error: any) {
      console.error('Resend verification error:', error);
      
      let errorMessage = 'Failed to resend code. Please try again.';
      
      if (error.response?.data?.error?.code === 'RATE_LIMITED') {
        errorMessage = error.response.data.error.message;
      } else if (error.response?.data?.error?.code === 'ALREADY_VERIFIED') {
        errorMessage = 'Your email is already verified. You can log in now.';
        navigate('/login');
        return;
      }
      
      toast({
        title: 'Resend Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6); // Only digits, max 6
    setVerificationCode(value);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Verify Your Email
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              We've sent a 6-digit verification code to your email address
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleVerifyEmail} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="text-center"
                required
              />
            </div>

            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <Input
                id="code"
                type="text"
                value={verificationCode}
                onChange={handleCodeChange}
                placeholder="000000"
                className="text-center text-2xl font-mono tracking-widest"
                maxLength={6}
                required
              />
              <p className="text-xs text-gray-500 mt-1 text-center">
                Enter the 6-digit code from your email
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isVerifying || verificationCode.length !== 6}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Verify Email
                </>
              )}
            </Button>
          </form>

          <div className="text-center space-y-3">
            <p className="text-sm text-gray-600">
              Didn't receive the code?
            </p>
            
            <Button
              variant="outline"
              onClick={handleResendCode}
              disabled={!canResend || isResending}
              className="w-full"
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : !canResend ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend in {resendCountdown}s
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend Code
                </>
              )}
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Check your email</p>
                <ul className="space-y-1 text-xs">
                  <li>• Look in your inbox and spam folder</li>
                  <li>• The code expires in 10 minutes</li>
                  <li>• Make sure you entered the correct email</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => navigate('/login')}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}