import { useEffect, useRef, useCallback } from 'react';
import { getWebSocketClient } from '@/lib/websocket-client';
import { useInterviewStore } from '@/store';

/**
 * Custom hook to manage WebSocket connection with automatic reconnection
 */
export function useWebSocket(autoConnect = true) {
  const wsClientRef = useRef(getWebSocketClient());
  const store = useInterviewStore();
  const hasConnectedRef = useRef(false);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    try {
      store.setConnectionState('connecting');
      await wsClientRef.current.connect();
      hasConnectedRef.current = true;
    } catch (error) {
      console.error('[useWebSocket] Connection failed:', error);
      store.setConnectionState('error');
      store.setError('Failed to connect to server');
      hasConnectedRef.current = false;
    }
  }, [store]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    wsClientRef.current.disconnect();
    store.setConnectionState('disconnected');
    hasConnectedRef.current = false;
  }, [store]);

  // Setup event listeners
  useEffect(() => {
    const wsClient = wsClientRef.current;

    // Connection events
    const unsubscribeConnected = wsClient.onConnected(() => {
      console.log('[useWebSocket] Connected');
      store.setConnectionState('connected');
      store.setError(null);
    });

    const unsubscribeDisconnected = wsClient.onDisconnected(() => {
      console.log('[useWebSocket] Disconnected');
      store.setConnectionState('disconnected');
    });

    const unsubscribeReconnecting = wsClient.onReconnecting((attempt) => {
      console.log(`[useWebSocket] Reconnecting… attempt ${attempt}`);
      store.setConnectionState('connecting');
      store.setError(`Reconnecting… (${attempt})`);
    });

    const unsubscribeReconnectFailed = wsClient.onReconnectFailed(() => {
      console.error('[useWebSocket] Reconnection failed');
      store.setConnectionState('error');
      store.setError('Connection failed. Please refresh the page.');
    });

    const unsubscribeError = wsClient.onError((error) => {
      store.setError(error.message);
      store.setConnectionState('error');
    });

    // Session events
    const unsubscribeSessionStarted = wsClient.onSessionStarted((data) => {
      store.setSessionId(data.sessionId);
      store.setSessionState('active');
      store.setCurrentSession({
        id: data.sessionId,
        startedAt: data.startedAt,
      } as any);
    });

    const unsubscribeTranscriptPartial = wsClient.onTranscriptPartial((data) => {
      store.updateCurrentTranscript(data.text || '');
    });

    const unsubscribeAIResponse = wsClient.onAIResponse((data) => {
      if (data.isFinal) {
        store.finalizeTranscript();
      } else {
        store.updateCurrentTranscript(data.content || '');
      }
    });

    const unsubscribeSessionEnded = wsClient.onSessionEnded((_data) => {
      store.setSessionState('completed');
      store.setIsRecording(false);
    });

    // Confidence update from frame analysis
    const unsubscribeConfidenceUpdate = wsClient.onConfidenceUpdate((data) => {
      console.log('[useWebSocket] Confidence update:', data);
      store.updateConfidence(data.confidence);
    });

    // Auto-connect on mount (once)
    if (autoConnect && !hasConnectedRef.current) {
      connect().catch((err) => {
        console.error('[useWebSocket] Auto-connect failed:', err);
      });
    }

    // Cleanup on unmount
    return () => {
      unsubscribeConnected();
      unsubscribeDisconnected();
      unsubscribeReconnecting();
      unsubscribeReconnectFailed();
      unsubscribeError();
      unsubscribeSessionStarted();
      unsubscribeTranscriptPartial();
      unsubscribeAIResponse();
      unsubscribeSessionEnded();
      unsubscribeConfidenceUpdate();
    };
  }, [store, autoConnect, connect]);

  return {
    connect,
    disconnect,
    isConnected: store.connectionState === 'connected',
    connectionState: store.connectionState,
    error: store.error,
  };
}
