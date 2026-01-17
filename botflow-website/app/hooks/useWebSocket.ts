'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseWebSocketOptions {
  onMessage?: (message: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  reconnectInterval?: number;
  autoConnect?: boolean;
}

export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

  const {
    onMessage,
    onConnect,
    onDisconnect,
    reconnectInterval = 5000,
    autoConnect = true
  } = options;

  const connect = useCallback(() => {
    try {
      // Don't connect if already connected
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

      // Get auth token
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No auth token found, cannot connect to WebSocket');
        return;
      }

      // Construct WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = process.env.NEXT_PUBLIC_WS_URL || window.location.host.replace('3000', '3001');
      const wsUrl = `${protocol}//${wsHost}${url}?token=${encodeURIComponent(token)}`;

      console.log('Connecting to WebSocket:', wsUrl);

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        reconnectAttemptsRef.current = 0;
        onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setMessages(prev => [...prev, message]);
          onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected', event.code, event.reason);
        setConnected(false);
        wsRef.current = null;
        onDisconnect?.();

        // Attempt reconnection if not at max attempts
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          const delay = reconnectInterval * Math.min(reconnectAttemptsRef.current, 5);

          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.error('Max reconnection attempts reached');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [url, onConnect, onMessage, onDisconnect, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  const send = useCallback((message: any) => {
    if (wsRef.current && connected) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }, [connected]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    connected,
    messages,
    send,
    disconnect,
    reconnect: connect,
    clearMessages
  };
}
