import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';

interface ConnectionStatusProps {
  className?: string;
}

export function ConnectionStatus({ className = '' }: ConnectionStatusProps) {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected' | 'error'>('checking');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkConnection = async () => {
    try {
      setStatus('checking');
      const response = await fetch('http://localhost:3001/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        setStatus('connected');
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Connection check failed:', error);
      setStatus('disconnected');
    } finally {
      setLastCheck(new Date());
    }
  };

  useEffect(() => {
    checkConnection();
    
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'text-green-500';
      case 'disconnected':
        return 'text-red-500';
      case 'error':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <Wifi className="w-4 h-4" />;
      case 'disconnected':
        return <WifiOff className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Wifi className="w-4 h-4 animate-pulse" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Backend Connected';
      case 'disconnected':
        return 'Backend Offline';
      case 'error':
        return 'Connection Error';
      default:
        return 'Checking...';
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={getStatusColor()}>
        {getStatusIcon()}
      </div>
      <span className={`text-sm ${getStatusColor()}`}>
        {getStatusText()}
      </span>
      {lastCheck && (
        <span className="text-xs text-gray-400">
          {lastCheck.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}