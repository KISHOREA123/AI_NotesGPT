import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api';

export default function LoginTest() {
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('Test User');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testLogin = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      console.log('Testing login with:', { email, password });
      
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      });
      
      console.log('Login response:', response);
      setResult({ type: 'success', data: response });
    } catch (error) {
      console.error('Login error:', error);
      setResult({ type: 'error', error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testRegister = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      console.log('Testing registration with:', { email, password, name });
      
      const response = await apiClient.post('/auth/register', {
        email,
        password,
        name,
      });
      
      console.log('Register response:', response);
      setResult({ type: 'success', data: response });
    } catch (error) {
      console.error('Register error:', error);
      setResult({ type: 'error', error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testMe = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      console.log('Testing /me endpoint');
      
      const response = await apiClient.get('/auth/me');
      
      console.log('/me response:', response);
      setResult({ type: 'success', data: response });
    } catch (error) {
      console.error('/me error:', error);
      setResult({ type: 'error', error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Login/Register Test</CardTitle>
            <CardDescription className="text-white/70">
              Direct API testing for authentication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-white text-sm">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-white text-sm">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-white text-sm">Name (for registration)</label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={testLogin} 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Test Login
              </Button>
              <Button 
                onClick={testRegister} 
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                Test Register
              </Button>
              <Button 
                onClick={testMe} 
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Test /me
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className={`${result.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {result.type === 'success' ? 'Success' : 'Error'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-white text-sm bg-black/20 p-4 rounded overflow-auto">
                {JSON.stringify(result.type === 'success' ? result.data : result.error, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}