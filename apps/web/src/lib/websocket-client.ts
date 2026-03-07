import { io, Socket } from 'socket.io-client';

import type {
  ConnectionState,
  StartSessionMessage,
  AudioChunkMessage,
  FrameAnalysisMessage,
  InterruptMessage,
  StopSessionMessage,
  SessionStartedResponse,
  TranscriptPartialResponse,
  AIResponse,
  ErrorResponse,
} from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
const NAMESPACE = '/live';

type EventCallback = (data: any) => void;
type ErrorCallback = (error: Error) => void;

interface ReconnectConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

/**
 * WebSocket client for live interview sessions with automatic reconnection
 */
class WebSocketClient {
  private socket: Socket | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private manualDisconnect = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  // Reconnection configuration
  private reconnectConfig: ReconnectConfig = {
    maxAttempts: 10,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  };

  // Event handlers
  private onConnectedCallbacks: Set<EventCallback> = new Set();
  private onDisconnectedCallbacks: Set<EventCallback> = new Set();
  private onErrorCallbacks: Set<ErrorCallback> = new Set();
  private onReconnectingCallbacks: Set<(attempt: number) => void> = new Set();
  private onReconnectFailedCallbacks: Set<EventCallback> = new Set();

  // Custom event listeners
  private customEventListeners: Map<string, Set<EventCallback>> = new Map();

  /**
   * Connect to the WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.manualDisconnect = false;
        this.setConnectionState('connecting');

        this.socket = io(`${WS_URL}${NAMESPACE}`, {
          transports: ['websocket', 'polling'],
          reconnection: false, // We'll handle reconnection manually
          timeout: 10000,
          withCredentials: true,  // Include cookies for Better Auth
        });

        // Connection successful
        this.socket.on('connect', () => {
          console.log('[WebSocket] Connected to server');
          this.setConnectionState('connected');
          this.reconnectAttempts = 0;

          // Re-attach all custom event listeners after reconnection
          this.reattachEventListeners();

          resolve();
        });

        // Connection error
        this.socket.on('connect_error', (error) => {
          console.error('[WebSocket] Connection error:', error);

          if (this.reconnectAttempts === 0) {
            this.setConnectionState('error');
            reject(error);
          }

          // Attempt reconnection if not manually disconnected
          if (!this.manualDisconnect) {
            this.scheduleReconnect();
          }
        });

        // Disconnect
        this.socket.on('disconnect', (reason) => {
          console.log('[WebSocket] Disconnected:', reason);
          this.setConnectionState('disconnected');
          this.notifyDisconnected();

          // Attempt reconnection if not manually disconnected
          if (!this.manualDisconnect && reason !== 'io client disconnect') {
            this.scheduleReconnect();
          }
        });

        // Handle server events
        this.setupServerEvents();

        // Error handler
        this.socket.on('error', (error) => {
          console.error('[WebSocket] Error:', error);
          this.notifyError(error);
        });

      } catch (error) {
        this.setConnectionState('error');
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    this.manualDisconnect = true;

    // Clear any pending reconnection
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.setConnectionState('disconnected');
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.manualDisconnect) {
      return;
    }

    if (this.reconnectAttempts >= this.reconnectConfig.maxAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      this.setConnectionState('error');
      this.notifyReconnectFailed();
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.reconnectConfig.initialDelay *
        Math.pow(this.reconnectConfig.backoffMultiplier, this.reconnectAttempts),
      this.reconnectConfig.maxDelay
    );

    this.reconnectAttempts++;
    console.log(
      `[WebSocket] Scheduling reconnection attempt ${this.reconnectAttempts}/${this.reconnectConfig.maxAttempts} in ${delay}ms`
    );
    this.setConnectionState('connecting');
    this.notifyReconnecting(this.reconnectAttempts);

    this.reconnectTimeout = setTimeout(() => {
      console.log(`[WebSocket] Reconnection attempt ${this.reconnectAttempts}`);
      this.socket?.connect();
    }, delay);
  }

  /**
   * Re-attach custom event listeners after reconnection
   */
  private reattachEventListeners(): void {
    if (!this.socket) return;

    this.customEventListeners.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        this.socket?.on(event, callback);
      });
    });
  }

  /**
   * Start a new interview session
   */
  startSession(data: StartSessionMessage): void {
    this.emit('start_session', data);
  }

  /**
   * Send audio chunk
   */
  sendAudioChunk(data: AudioChunkMessage): void {
    this.emit('audio_chunk', data);
  }

  /**
   * Send frame analysis data
   */
  sendFrameAnalysis(data: FrameAnalysisMessage): void {
    this.emit('frame_analysis', data);
  }

  /**
   * Interrupt the current session
   */
  interruptSession(data: InterruptMessage): void {
    this.emit('interrupt', data);
  }

  /**
   * Stop the current session
   */
  stopSession(data: StopSessionMessage): void {
    this.emit('stop_session', data);
  }

  /**
   * Register event handlers
   */
  onConnected(callback: EventCallback): () => void {
    this.onConnectedCallbacks.add(callback);
    return () => this.onConnectedCallbacks.delete(callback);
  }

  onDisconnected(callback: EventCallback): () => void {
    this.onDisconnectedCallbacks.add(callback);
    return () => this.onDisconnectedCallbacks.delete(callback);
  }

  onError(callback: ErrorCallback): () => void {
    this.onErrorCallbacks.add(callback);
    return () => this.onErrorCallbacks.delete(callback);
  }

  onReconnecting(callback: (attempt: number) => void): () => void {
    this.onReconnectingCallbacks.add(callback);
    return () => this.onReconnectingCallbacks.delete(callback);
  }

  onReconnectFailed(callback: EventCallback): () => void {
    this.onReconnectFailedCallbacks.add(callback);
    return () => this.onReconnectFailedCallbacks.delete(callback);
  }

  /**
   * Generic event listener for any server event
   */
  on(event: string, callback: EventCallback): () => void {
    if (!this.customEventListeners.has(event)) {
      this.customEventListeners.set(event, new Set());
    }
    this.customEventListeners.get(event)!.add(callback);

    // Attach to socket immediately if connected
    if (this.socket?.connected) {
      this.socket.on(event, callback);
    }

    return () => this.off(event, callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: EventCallback): void {
    const listeners = this.customEventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (this.socket) {
        this.socket.off(event, callback);
      }
    }
  }

  /**
   * Typed event listeners for specific events
   */
  onSessionStarted(callback: (data: SessionStartedResponse) => void): () => void {
    return this.on('session_started', callback);
  }

  onAudioReceived(callback: EventCallback): () => void {
    return this.on('audio_received', callback);
  }

  onTranscriptPartial(callback: (data: TranscriptPartialResponse) => void): () => void {
    return this.on('transcript_partial', callback);
  }

  onAIResponse(callback: (data: AIResponse) => void): () => void {
    return this.on('ai_response', callback);
  }

  onSessionEnded(callback: EventCallback): () => void {
    return this.on('session_ended', callback);
  }

  onServerResponse(callback: (data: ErrorResponse) => void): () => void {
    return this.on('error', callback);
  }

  onConfidenceUpdate(callback: (data: any) => void): () => void {
    return this.on('confidence_update', callback);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Private method to emit events
   */
  private emit(event: string, data?: unknown): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`[WebSocket] Cannot emit "${event}": not connected`);
    }
  }

  /**
   * Setup server event listeners
   */
  private setupServerEvents(): void {
    // Connection established
    this.on('connection_established', (data: any) => {
      console.log('[WebSocket] Connection established:', data);
    });

    // Session started
    this.on('session_started', (data: SessionStartedResponse) => {
      console.log('[WebSocket] Session started:', data.sessionId);
    });

    // Transcript partial (streaming response)
    this.on('transcript_partial', (data: TranscriptPartialResponse) => {
      console.log('[WebSocket] Transcript partial:', data.text?.substring(0, 50) + '...');
    });

    // AI response
    this.on('ai_response', (data: AIResponse) => {
      console.log('[WebSocket] AI response:', data.content?.substring(0, 50) + '...');
    });

    // Session ended
    this.on('session_ended', (data: any) => {
      console.log('[WebSocket] Session ended:', data);
    });

    // Error
    this.on('error', (data: ErrorResponse) => {
      console.error('[WebSocket] Server error:', data);
    });
  }

  /**
   * Set connection state and notify listeners
   */
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      if (state === 'connected') {
        this.notifyConnected();
      }
    }
  }

  /**
   * Notify connected listeners
   */
  private notifyConnected(): void {
    this.onConnectedCallbacks.forEach((callback) => {
      try {
        callback(undefined);
      } catch (error) {
        console.error('[WebSocket] Error in connected callback:', error);
      }
    });
  }

  /**
   * Notify disconnected listeners
   */
  private notifyDisconnected(): void {
    this.onDisconnectedCallbacks.forEach((callback) => {
      try {
        callback(undefined);
      } catch (error) {
        console.error('[WebSocket] Error in disconnected callback:', error);
      }
    });
  }

  /**
   * Notify error listeners
   */
  private notifyError(error: Error): void {
    this.onErrorCallbacks.forEach((callback) => {
      try {
        callback(error);
      } catch (err) {
        console.error('[WebSocket] Error in error callback:', err);
      }
    });
  }

  /**
   * Notify reconnecting listeners
   */
  private notifyReconnecting(attempt: number): void {
    this.onReconnectingCallbacks.forEach((callback) => {
      try {
        callback(attempt);
      } catch (error) {
        console.error('[WebSocket] Error in reconnecting callback:', error);
      }
    });
  }

  /**
   * Notify reconnect failed listeners
   */
  private notifyReconnectFailed(): void {
    this.onReconnectFailedCallbacks.forEach((callback) => {
      try {
        callback(undefined);
      } catch (error) {
        console.error('[WebSocket] Error in reconnect failed callback:', error);
      }
    });
  }
}

// Singleton instance
let wsClient: WebSocketClient | null = null;

export const getWebSocketClient = (): WebSocketClient => {
  if (!wsClient) {
    wsClient = new WebSocketClient();
  }
  return wsClient;
};

export default wsClient;
