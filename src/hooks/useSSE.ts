import { useEffect, useRef, useCallback, useState } from 'react';
import { sessionService } from '@/services';
import type { SSEMessage } from '@/types/prd';

interface UseSSEOptions {
  onMessage?: (data: SSEMessage) => void;
  onError?: (error: Event) => void;
  onOpen?: (event: Event) => void;
  onClose?: (event: Event) => void;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseSSEReturn {
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  connect: (sessionId: string, message?: string) => void;
  disconnect: () => void;
  lastMessage: SSEMessage | null;
  error: string | null;
}

/**
 * Hook for managing Server-Sent Events connection
 */
export function useSSE(options: UseSSEOptions = {}): UseSSEReturn {
  const {
    onMessage,
    onError,
    onOpen,
    onClose,
    autoConnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = options;

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(true);

  const [connectionState, setConnectionState] = useState<UseSSEReturn['connectionState']>('disconnected');
  const [lastMessage, setLastMessage] = useState<SSEMessage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback((sessionId: string, message?: string) => {
    cleanup();
    setConnectionState('connecting');
    setError(null);

    try {
      const eventSource = sessionService.createEventSource(sessionId, message);
      eventSourceRef.current = eventSource;

      eventSource.onopen = (event) => {
        setConnectionState('connected');
        reconnectAttemptsRef.current = 0;
        onOpen?.(event);
      };

      eventSource.onmessage = (event) => {
        try {
          const data: SSEMessage = JSON.parse(event.data);
          setLastMessage(data);
          onMessage?.(data);
        } catch (err) {
          console.error('Failed to parse SSE message:', err);
          setError('Failed to parse message from server');
        }
      };

      eventSource.onerror = (event) => {
        console.warn('SSE connection error:', event);
        setConnectionState('error');
        onError?.(event);

        // More conservative auto-reconnect logic
        if (shouldReconnectRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          setError(`Connection lost. Reconnecting... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          // Exponential backoff with longer delays
          const delay = Math.min(reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (shouldReconnectRef.current) {
              connect(sessionId, message);
            }
          }, delay);
        } else {
          setError('Connection failed after multiple attempts. Please try sending another message.');
          setConnectionState('disconnected');
          shouldReconnectRef.current = false; // Stop further reconnection attempts
        }
      };

      eventSource.onclose = (event) => {
        setConnectionState('disconnected');
        onClose?.(event);
      };

    } catch (err) {
      setError(`Failed to connect: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setConnectionState('error');
    }
  }, [cleanup, onMessage, onError, onOpen, onClose, maxReconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    cleanup();
    setConnectionState('disconnected');
    setError(null);
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldReconnectRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  // Reset reconnection flag when explicitly connecting
  useEffect(() => {
    if (connectionState === 'connecting') {
      shouldReconnectRef.current = true;
    }
  }, [connectionState]);

  return {
    connectionState,
    connect,
    disconnect,
    lastMessage,
    error,
  };
}

/**
 * Hook for managing SSE with automatic PRD updates
 */
export function useSSEWithPRDUpdates(
  sessionId: string | null,
  onSSEMessage?: (data: SSEMessage) => void,
  onPRDUpdate?: () => void
) {
  const { connectionState, connect, disconnect, lastMessage, error } = useSSE({
    onMessage: (data) => {
      onSSEMessage?.(data);
      
      // Trigger PRD update when AI finishes processing
      if (data.needs_input === true || data.stage === 'completed') {
        onPRDUpdate?.();
      }
    },
    onError: (event) => {
      console.error('SSE connection error:', event);
    },
    autoConnect: false,
  });

  const startStreaming = useCallback((message: string) => {
    if (sessionId) {
      connect(sessionId, message);
    }
  }, [sessionId, connect]);

  const stopStreaming = useCallback(() => {
    disconnect();
  }, [disconnect]);

  return {
    connectionState,
    startStreaming,
    stopStreaming,
    lastMessage,
    error,
  };
}