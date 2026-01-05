import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { authService } from '@/services/authService';
import { notesService } from '@/services/notesService';

export default function ApiTest() {
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (test: string, success: boolean, data?: any, error?: any) => {
    setResults(prev => [...prev, {
      test,
      success,
      data,
      error: error?.message || error,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const testApiConnection = async () => {
    setIsLoading(true);
    setResults([]);

    try {
      // Test 1: Basic API health check
      try {
        const response = await fetch('http://localhost:3001/health');
        const data = await response.json();
        addResult('Health Check', response.ok, data);
      } catch (error) {
        addResult('Health Check', false, null, error);
      }

      // Test 2: Auth endpoints
      try {
        const response = await apiClient.post('/auth/login', {
          email: 'test@example.com',
          password: 'password123'
        });
        addResult('Auth Login Endpoint', true, response);
      } catch (error) {
        addResult('Auth Login Endpoint', false, null, error);
      }

      try {
        const response = await apiClient.post('/auth/register', {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        });
        addResult('Auth Register Endpoint', true, response);
      } catch (error) {
        addResult('Auth Register Endpoint', false, null, error);
      }

      // Test 3: Notes endpoints
      try {
        const response = await apiClient.get('/notes');
        addResult('Notes Get Endpoint', true, response);
      } catch (error) {
        addResult('Notes Get Endpoint', false, null, error);
      }

      try {
        const response = await apiClient.post('/notes', {
          title: 'Test Note',
          content: 'This is a test note',
          color: 'default'
        });
        addResult('Notes Create Endpoint', true, response);
      } catch (error) {
        addResult('Notes Create Endpoint', false, null, error);
      }

      // Test 4: Service layer tests
      try {
        await authService.login({ email: 'test@example.com', password: 'password123' });
        addResult('Auth Service Login', false, null, 'Expected to fail - not implemented');
      } catch (error) {
        addResult('Auth Service Login', true, null, 'Expected error - endpoint not implemented');
      }

    } catch (error) {
      addResult('General Error', false, null, error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8">
          <h1 className="text-3xl font-bold text-white mb-6">API Integration Test</h1>
          
          <div className="mb-6">
            <button
              onClick={testApiConnection}
              disabled={isLoading}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg font-medium transition-colors"
            >
              {isLoading ? 'Testing...' : 'Run API Tests'}
            </button>
          </div>

          <div className="space-y-4">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.success
                    ? 'bg-green-500/10 border-green-500/30 text-green-100'
                    : 'bg-red-500/10 border-red-500/30 text-red-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{result.test}</h3>
                  <span className="text-sm opacity-70">{result.timestamp}</span>
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-3 h-3 rounded-full ${
                    result.success ? 'bg-green-500' : 'bg-red-500'
                  }`}></span>
                  <span className="text-sm">
                    {result.success ? 'Success' : 'Failed'}
                  </span>
                </div>

                {result.data && (
                  <div className="mt-2">
                    <p className="text-sm opacity-70 mb-1">Response:</p>
                    <pre className="text-xs bg-black/20 p-2 rounded overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                )}

                {result.error && (
                  <div className="mt-2">
                    <p className="text-sm opacity-70 mb-1">Error:</p>
                    <pre className="text-xs bg-black/20 p-2 rounded overflow-x-auto">
                      {typeof result.error === 'string' ? result.error : JSON.stringify(result.error, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>

          {results.length === 0 && !isLoading && (
            <div className="text-center text-white/60 py-8">
              Click "Run API Tests" to test the backend connection
            </div>
          )}
        </div>
      </div>
    </div>
  );
}