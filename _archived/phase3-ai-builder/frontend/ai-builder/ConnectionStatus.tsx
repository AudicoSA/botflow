'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { aiAgentService } from '@/app/services/ai-agent.service';

type ConnectionState = 'checking' | 'online' | 'offline';

interface ConnectionStatusProps {
  className?: string;
}

/**
 * Connection status indicator component
 * Shows the current connection status to the backend
 */
export function ConnectionStatus({ className = '' }: ConnectionStatusProps) {
  const [status, setStatus] = useState<ConnectionState>('checking');

  useEffect(() => {
    let mounted = true;

    const checkConnection = async () => {
      try {
        const isHealthy = await aiAgentService.healthCheck();
        if (mounted) {
          setStatus(isHealthy ? 'online' : 'offline');
        }
      } catch {
        if (mounted) {
          setStatus('offline');
        }
      }
    };

    // Initial check
    checkConnection();

    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (status === 'checking') {
    return (
      <div className={`flex items-center gap-1.5 text-gray-500 text-sm ${className}`}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Connecting...</span>
      </div>
    );
  }

  if (status === 'offline') {
    return (
      <div className={`flex items-center gap-1.5 text-red-600 text-sm ${className}`}>
        <WifiOff className="w-3.5 h-3.5" />
        <span>Offline</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 text-green-600 text-sm ${className}`}>
      <Wifi className="w-3.5 h-3.5" />
      <span>Connected</span>
    </div>
  );
}

export default ConnectionStatus;
