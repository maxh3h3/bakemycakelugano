/**
 * React Hook for Production SSE (Server-Sent Events)
 * 
 * This hook establishes a connection to the SSE endpoint and listens for
 * real-time production updates (new orders, status changes, etc.)
 * 
 * Features:
 * - Auto-connect on mount
 * - Auto-reconnect on disconnect
 * - Clean disconnect on unmount
 * - Event parsing and handling
 * - Connection status tracking
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { ProductionEvent } from '@/lib/events/production-events';

interface SSEConnectionState {
  connected: boolean;
  error: string | null;
  lastEvent: ProductionEvent | null;
  clientId: string | null;
}

interface UseProductionSSEOptions {
  enabled?: boolean;
  onEvent?: (event: ProductionEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
}

export function useProductionSSE(options: UseProductionSSEOptions = {}) {
  const {
    enabled = true,
    onEvent,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [state, setState] = useState<SSEConnectionState>({
    connected: false,
    error: null,
    lastEvent: null,
    clientId: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);
  
  // Store callbacks in refs to avoid recreating connect function
  const onEventRef = useRef(onEvent);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onErrorRef = useRef(onError);
  
  // Update refs when callbacks change
  useEffect(() => {
    onEventRef.current = onEvent;
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
    onErrorRef.current = onError;
  }, [onEvent, onConnect, onDisconnect, onError]);

  const connect = useCallback(() => {
    // Don't connect if disabled or already connected or unmounted
    if (!enabled || eventSourceRef.current || isUnmountedRef.current) {
      return;
    }

    console.log('[SSE] Connecting to production stream...');

    try {
      const eventSource = new EventSource('/api/admin/production/stream');
      eventSourceRef.current = eventSource;

      // Handle connection opened
      eventSource.onopen = () => {
        console.log('[SSE] Connection established');
        setState(prev => ({
          ...prev,
          connected: true,
          error: null,
        }));
        onConnectRef.current?.();
      };

      // Handle incoming messages
      eventSource.onmessage = (event) => {
        try {
          // Skip heartbeat comments (start with :)
          if (event.data.trim().startsWith(':')) {
            return;
          }
          
          const data = JSON.parse(event.data);
          
          // Handle connection confirmation
          if (data.type === 'connected') {
            console.log('[SSE] Connection confirmed:', data.clientId);
            setState(prev => ({
              ...prev,
              clientId: data.clientId,
            }));
            return;
          }

          // Handle production events
          console.log('[SSE] Received event:', data.type);
          setState(prev => ({
            ...prev,
            lastEvent: data as ProductionEvent,
          }));
          
          onEventRef.current?.(data as ProductionEvent);
        } catch (parseError) {
          console.error('[SSE] Failed to parse event data:', parseError, 'Data:', event.data);
        }
      };

      // Handle errors
      eventSource.onerror = (error) => {
        console.error('[SSE] Connection error:', error);
        
        // Close the connection
        eventSource.close();
        eventSourceRef.current = null;

        setState(prev => ({
          ...prev,
          connected: false,
          error: 'Connection lost',
        }));

        onDisconnectRef.current?.();
        onErrorRef.current?.('Connection lost');

        // Attempt to reconnect after 5 seconds if not unmounted
        if (!isUnmountedRef.current) {
          console.log('[SSE] Reconnecting in 5 seconds...');
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000);
        }
      };
    } catch (error) {
      console.error('[SSE] Failed to create EventSource:', error);
      setState(prev => ({
        ...prev,
        connected: false,
        error: 'Failed to connect',
      }));
      onErrorRef.current?.('Failed to connect');
    }
  }, [enabled]); // Only depend on enabled, callbacks are handled via refs

  const disconnect = useCallback(() => {
    console.log('[SSE] Disconnecting...');

    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close event source
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setState({
      connected: false,
      error: null,
      lastEvent: null,
      clientId: null,
    });
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    isUnmountedRef.current = false;
    
    if (enabled) {
      connect();
    }

    return () => {
      isUnmountedRef.current = true;
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]); // Only reconnect when enabled changes, not when callbacks change

  return {
    connected: state.connected,
    error: state.error,
    lastEvent: state.lastEvent,
    clientId: state.clientId,
    reconnect: connect,
    disconnect,
  };
}
