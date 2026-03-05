'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createWebSocketClient, RobustWebSocketClient } from '@/lib/websocket-client-robust';

export interface WebSocketRobustOptions {
  url?: string;
  path?: string;
  authToken?: string;
  autoConnect?: boolean;
  debug?: boolean;
  reconnectConfig?: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
  };
  retryConfig?: {
    maxAttempts?: number;
    timeout?: number;
  };
}

export interface UseWebSocketRobustReturn {
  // Connection state
  connected: boolean;
  connecting: boolean;
  reconnecting: boolean;
  state: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

  // Error state
  error: Error | null;
  errorCount: number;
  lastErrorTime: number | null;

  // Statistics
  reconnectAttempts: number;
  pendingMessages: number;

  // Actions
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  send: (event: string, data?: any) => void;
  sendWithRetry: (event: string, data?: any, options?: { timeout?: number; retries?: number }) => Promise<any>;

  // Event listeners
  on: (event: string, callback: (...args: any[]) => void) => () => void;

  // Client instance
  client: RobustWebSocketClient | null;
}

/**
 * Robust WebSocket Hook with Auto-Reconnect, Retry, and Timeout Handling
 *
 * Provides:
 * - Automatic reconnection with exponential backoff
 * - Message retry with configurable attempts
 * - Timeout handling for all operations
 * - Connection state management
 * - Error tracking and reporting
 */
export function useWebSocketRobust(options: WebSocketRobustOptions = {}): UseWebSocketRobustReturn {
  const {
    url = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
    path = '/live',
    authToken,
    autoConnect = true,
    debug = process.env.NODE_ENV === 'development',
    reconnectConfig = {},
    retryConfig = {},
  } = options;

  // State management
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting'>('disconnected');
  const [error, setError] = useState<Error | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const [lastErrorTime, setLastErrorTime] = useState<number | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [pendingMessages, setPendingMessages] = useState(0);

  // Client ref to prevent re-creation
  const clientRef = useRef<RobustWebSocketClient | null>(null);
  const cleanupFunctionsRef = useRef<Map<string, () => void>>(new Map());

  /**
   * Create or get existing WebSocket client
   */
  const client = useMemo(() => {
    if (!clientRef.current) {
      clientRef.current = createWebSocketClient({
        url,
        path,
        authToken,
        reconnection: true,
        reconnectConfig: {
          maxAttempts: reconnectConfig.maxAttempts || 10,
          initialDelay: reconnectConfig.initialDelay || 1000,
          maxDelay: reconnectConfig.maxDelay || 30000,
        },
        retryConfig: {
          maxAttempts: retryConfig.maxAttempts || 3,
          timeout: retryConfig.timeout || 10000,
        },
        debug,
        // Connection lifecycle callbacks
        onConnecting: () => {
          setState('connecting');
        },
        onConnected: () => {
          setConnected(true);
          setState('connected');
          setError(null);
        },
        onDisconnected: (_reason: string) => {
          setConnected(false);
          setState('disconnected');
        },
        onError: (err: Error) => {
          setError(err);
          setErrorCount((prev) => prev + 1);
          setLastErrorTime(Date.now());
        },
        onReconnecting: (attempt: number) => {
          setReconnectAttempts(attempt);
          setState('reconnecting');
        },
        onReconnected: () => {
          setReconnectAttempts(0);
          setConnected(true);
          setState('connected');
        },
        onMaxReconnectReached: () => {
          setError(new Error('Max reconnection attempts reached'));
          setState('disconnected');
        },
      });
    }

    return clientRef.current;
  }, [url, path, authToken]);

  /**
   * Update connection stats periodically
   */
  useEffect(() => {
    const interval = setInterval(() => {
      if (client) {
        const stats = client.getStats();
        setReconnectAttempts(stats.reconnectAttempts);
        setPendingMessages(stats.pendingMessages);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [client]);

  /**
   * Auto-connect on mount if enabled
   */
  useEffect(() => {
    if (autoConnect && client && !client.connected) {
      client.connect();
    }

    return () => {
      // Cleanup all event listeners on unmount
      for (const cleanup of cleanupFunctionsRef.current.values()) {
        cleanup();
      }
      cleanupFunctionsRef.current.clear();
    };
  }, [autoConnect, client]);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    client?.connect();
  }, [client]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    client?.disconnect();
    setConnected(false);
    setState('disconnected');
  }, [client]);

  /**
   * Reconnect to WebSocket server
   */
  const reconnect = useCallback(() => {
    client?.reconnect();
  }, [client]);

  /**
   * Send a message without retry
   */
  const send = useCallback((event: string, data?: any) => {
    client?.send(event, data);
  }, [client]);

  /**
   * Send a message with retry and timeout handling
   */
  const sendWithRetry = useCallback(
    (event: string, data?: any, options?: { timeout?: number; retries?: number }) => {
      if (!client) {
        return Promise.reject(new Error('WebSocket client not initialized'));
      }

      return client.sendWithRetry(event, data, options);
    },
    [client]
  );

  /**
   * Register event listener with automatic cleanup
   */
  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (!client) {
      console.warn('Cannot add listener: WebSocket client not initialized');
      return () => { };
    }

    const cleanup = client.on(event, callback);
    cleanupFunctionsRef.current.set(`${event}_${Date.now()}`, cleanup);

    return cleanup;
  }, [client]);

  /**
   * Computed state properties
   */
  const connecting = state === 'connecting';
  const reconnectingState = state === 'reconnecting';

  return {
    connected,
    connecting,
    reconnecting: reconnectingState,
    state,
    error,
    errorCount,
    lastErrorTime,
    reconnectAttempts,
    pendingMessages,
    connect,
    disconnect,
    reconnect,
    send,
    sendWithRetry,
    on,
    client,
  };
}

/**
 * Hook for specific WebSocket event with auto-reconnect handling
 */
export function useWebSocketEvent<T = any>(
  event: string,
  callback: (data: T) => void,
  options: WebSocketRobustOptions = {}
) {
  const { on, connected } = useWebSocketRobust(options);

  useEffect(() => {
    if (!connected) return;

    const cleanup = on(event, callback);

    return cleanup;
  }, [event, callback, connected, on]);
}

/**
 * Hook for interview session with WebSocket
 */
export function useInterviewWebSocket(sessionId: string | null, options?: WebSocketRobustOptions) {
  const ws = useWebSocketRobust(options);
  const [transcript, setTranscript] = useState<Array<{ role: string; content: string }>>([]);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  // Listen to transcript updates
  useEffect(() => {
    if (!ws.connected || !sessionId) return;

    const cleanupTranscript = ws.on('transcript_partial', (data: any) => {
      if (data.sessionId === sessionId) {
        setTranscript((prev) => [...prev, { role: 'assistant', content: data.text }]);
      }
    });

    const cleanupAIResponse = ws.on('ai_response', (data: any) => {
      if (data.sessionId === sessionId) {
        setTranscript((prev) => [...prev, { role: data.role, content: data.content }]);
        setIsStreaming(false);
      }
    });

    const cleanupConfidence = ws.on('confidence_update', (data: any) => {
      if (data.sessionId === sessionId) {
        setConfidence(data.score || data.confidence);
      }
    });

    return () => {
      cleanupTranscript();
      cleanupAIResponse();
      cleanupConfidence();
    };
  }, [ws.connected, sessionId]);

  /**
   * Start interview session
   */
  const startSession = useCallback(async (jobDescription: string, mode?: string) => {
    if (!ws.client) throw new Error('WebSocket not connected');

    return ws.sendWithRetry('start_session', {
      sessionId: sessionId || undefined,
      jobDescription,
      mode,
    }, { timeout: 15000, retries: 3 });
  }, [ws.client, sessionId]);

  /**
   * Send audio chunk
   */
  const sendAudio = useCallback(async (chunkData: string, sequenceNumber: number) => {
    if (!sessionId) throw new Error('No active session');

    return ws.sendWithRetry('audio_chunk', {
      sessionId,
      chunkData,
      sequenceNumber,
      timestamp: Date.now(),
    }, { timeout: 5000, retries: 2 });
  }, [ws, sessionId]);

  /**
   * Send frame analysis
   */
  const sendFrame = useCallback(async (frameData: string, frameNumber: number) => {
    if (!sessionId) throw new Error('No active session');

    return ws.sendWithRetry('frame_analysis', {
      sessionId,
      frameData,
      frameNumber,
      timestamp: Date.now(),
    }, { timeout: 10000, retries: 2 });
  }, [ws, sessionId]);

  /**
   * Stop session
   */
  const stopSession = useCallback(async () => {
    if (!sessionId) throw new Error('No active session');

    return ws.sendWithRetry('stop_session', {
      sessionId,
      reason: 'user_completed',
    }, { timeout: 5000, retries: 3 });
  }, [ws, sessionId]);

  /**
   * Interrupt session
   */
  const interrupt = useCallback(async () => {
    if (!sessionId) throw new Error('No active session');

    return ws.sendWithRetry('interrupt', {
      sessionId,
      reason: 'user_stopped',
    }, { timeout: 3000, retries: 1 });
  }, [ws, sessionId]);

  return {
    ...ws,
    transcript,
    confidence,
    isStreaming,
    startSession,
    sendAudio,
    sendFrame,
    stopSession,
    interrupt,
  };
}

export default useWebSocketRobust;
