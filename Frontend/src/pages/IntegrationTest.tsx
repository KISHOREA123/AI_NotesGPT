import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotes } from '@/context/NotesContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function IntegrationTest() {
  const { user, isAuthenticated, login, logout, isLoading: authLoading } = useAuth();
  const { notes, createNote, isLoading: notesLoading } = useNotes();
  const [testResults, setTestResults] = useState<Array<{
    test: string;
    status: 'pending' | 'success' | 'error';
    message?: string;
    timestamp: string;
  }>>([]);

  const addTestResult = (test: string, status: 'success' | 'error', message?: string) => {
    setTestResults(prev => [...prev, {
      test,
      status,
      message,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const runIntegrationTests = async () => {
    setTestResults([]);
    
    try {
      // Test 1: Login
      addTestResult('User Login', 'pending');
      await login('test@example.com', 'password123');
      addTestResult('User Login', 'success', 'Successfully logged in');
      
      // Wait a moment for notes to load
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test 2: Fetch Notes
      addTestResult('Fetch Notes', 'success', `Loaded ${notes.length} notes`);
      
      // Test 3: Create Note
      addTestResult('Create Note', 'pending');
      const newNote = await createNote('Integration Test Note', 'This note was created during integration testing.', 'blue');
      addTestResult('Create Note', 'success', `Created note: ${newNote.title}`);
      
    } catch (error) {
      addTestResult('Integration Test', 'error', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setTestResults([]);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Frontend-Backend Integration Test</CardTitle>
            <CardDescription className="text-white/70">
              Test the connection between frontend and backend services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Authentication Status */}
            <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg">
              <div className="flex items-center gap-2">
                {isAuthenticated ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span className="text-white font-medium">
                  Authentication: {isAuthenticated ? 'Logged In' : 'Not Logged In'}
                </span>
              </div>
              {user && (
                <div className="text-white/70">
                  User: {user.name} ({user.email})
                </div>
              )}
            </div>

            {/* Notes Status */}
            <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-white font-medium">
                  Notes: {notes.length} loaded
                </span>
              </div>
              {notesLoading && (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              {!isAuthenticated ? (
                <Button 
                  onClick={runIntegrationTests}
                  disabled={authLoading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {authLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Run Integration Tests'
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={handleLogout}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Logout
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        {testResults.length > 0 && (
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      result.status === 'success'
                        ? 'bg-green-500/10 border-green-500/30'
                        : result.status === 'error'
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-yellow-500/10 border-yellow-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {result.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                        {result.status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                        {result.status === 'pending' && <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />}
                        <span className="text-white font-medium">{result.test}</span>
                      </div>
                      <span className="text-white/60 text-sm">{result.timestamp}</span>
                    </div>
                    {result.message && (
                      <p className="text-white/80 text-sm mt-1">{result.message}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes Display */}
        {isAuthenticated && notes.length > 0 && (
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Loaded Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {notes.slice(0, 5).map((note) => (
                  <div key={note.id} className="p-3 bg-white/5 rounded-lg">
                    <h3 className="text-white font-medium">{note.title}</h3>
                    <p className="text-white/70 text-sm mt-1 line-clamp-2">{note.content}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-white/50">
                      <span>Color: {note.color}</span>
                      <span>•</span>
                      <span>Created: {new Date(note.createdAt).toLocaleDateString()}</span>
                      {note.isPinned && (
                        <>
                          <span>•</span>
                          <span className="text-yellow-400">Pinned</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {notes.length > 5 && (
                  <div className="text-center text-white/60 text-sm">
                    ... and {notes.length - 5} more notes
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}