/**
 * Robust WebSocket Client with Auto-Reconnect, Retry, and Timeout Handling
 *
 * Features:
 * - Exponential backoff reconnection
 * - Automatic retry for failed messages
 * - Request timeout handling
 * - Connection state management
 * - Event acknowledgment tracking
 */

import { io, Socket } from 'socket.io-client';

export interface ReconnectConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  randomDelayFactor?: number;
}

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  timeout: number;
}

export interface TimeoutConfig {
  connection: number;
  message: number;
  ping: number;
}

export interface WebSocketClientOptions {
  url: string;
  path?: string;
  reconnection?: boolean;
  reconnectConfig?: Partial<ReconnectConfig>;
  retryConfig?: Partial<RetryConfig>;
  timeoutConfig?: Partial<TimeoutConfig>;
  authToken?: string;
  debug?: boolean;
  onConnecting?: () => void;
  onConnected?: () => void;
  onDisconnected?: (reason: string) => void;
  onError?: (error: Error) => void;
  onReconnecting?: (attempt: number) => void;
  onReconnected?: () => void;
  onMaxReconnectReached?: () => void;
}

type EventCallback = (...args: any[]) => void;

interface PendingMessage {
  event: string;
  data: any;
  attempts: number;
  lastAttempt: number;
  timeoutId: NodeJS.Timeout;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}

export class RobustWebSocketClient {
  private socket: Socket | null = null;
  private url: string;
  private options: Required<WebSocketClientOptions>;

  // Reconnection state
  private reconnectAttempts = 0;
  private isManualDisconnect = false;
  private reconnectTimeoutId: NodeJS.Timeout | null = null;

  // Message tracking for retry
  private pendingMessages = new Map<string, PendingMessage>();
  private messageIdCounter = 0;

  // Event listeners
  private eventListeners = new Map<string, Set<EventCallback>>();

  // Default configurations
  private readonly defaultReconnectConfig: ReconnectConfig = {
    maxAttempts: 10,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    randomDelayFactor: 0.2,
  };

  private readonly defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    initialDelay: 500,
    maxDelay: 5000,
    backoffMultiplier: 1.5,
    timeout: 10000,
  };

  private readonly defaultTimeoutConfig: TimeoutConfig = {
    connection: 15000,
    message: 10000,
    ping: 25000,
  };

  constructor(options: WebSocketClientOptions) {
    this.url = options.url;

    this.options = {
      url: options.url,
      path: options.path || '/live',
      reconnection: options.reconnection !== false,
      reconnectConfig: {
        ...this.defaultReconnectConfig,
        ...options.reconnectConfig,
      },
      retryConfig: {
        ...this.defaultRetryConfig,
        ...options.retryConfig,
      },
      timeoutConfig: {
        ...this.defaultTimeoutConfig,
        ...options.timeoutConfig,
      },
      authToken: options.authToken || '',
      debug: options.debug || false,
      onConnecting: options.onConnecting || (() => { }),
      onConnected: options.onConnected || (() => { }),
      onDisconnected: options.onDisconnected || (() => { }),
      onError: options.onError || (() => { }),
      onReconnecting: options.onReconnecting || (() => { }),
      onReconnected: options.onReconnected || (() => { }),
      onMaxReconnectReached: options.onMaxReconnectReached || (() => { }),
    };

    if (this.options.reconnection) {
      this.connect();
    }
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.socket?.connected) {
      this.debug('Already connected');
      return;
    }

    this.isManualDisconnect = false;
    this.options.onConnecting();

    this.socket = io(this.url, {
      path: this.options.path,
      transports: ['websocket', 'polling'],
      reconnection: false, // We handle reconnection ourselves
      timeout: this.options.timeoutConfig.connection,
      auth: this.options.authToken ? { token: this.options.authToken } : undefined,
    });

    this.setupEventHandlers();
  }

  /**
   * Setup socket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', this.handleConnect);
    this.socket.on('disconnect', this.handleDisconnect);
    this.socket.on('error', this.handleError);
    this.socket.on('connect_error', this.handleConnectError);
    this.socket.on('reconnect_attempt', this.handleReconnectAttempt);
    this.socket.on('reconnect', this.handleReconnect);
    this.socket.on('reconnect_failed', this.handleReconnectFailed);

    // Setup acknowledgment handlers
    this.setupMessageTracking();
  }

  /**
   * Handle successful connection
   */
  private handleConnect = (): void => {
    this.debug('Connected to WebSocket server');
    this.reconnectAttempts = 0;

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    this.options.onConnected();

    // Retry pending messages
    this.retryPendingMessages();
  };

  /**
   * Handle disconnection
   */
  private handleDisconnect = (reason: string): void => {
    this.debug(`Disconnected: ${reason}`);

    // Mark pending messages as failed but keep them for retry
    for (const [_id, pending] of this.pendingMessages.entries()) {
      if (!pending.timeoutId) continue;
      clearTimeout(pending.timeoutId);
    }

    this.options.onDisconnected(reason);

    // Auto-reconnect if not manual disconnect
    if (!this.isManualDisconnect && this.options.reconnection) {
      this.scheduleReconnect();
    }
  };

  /**
   * Handle socket error
   */
  private handleError = (error: Error): void => {
    this.debug('Socket error:', error);
    this.options.onError(error);
  };

  /**
   * Handle connection error
   */
  private handleConnectError = (error: Error): void => {
    this.debug('Connection error:', error);
    this.options.onError(error);
  };

  /**
   * Handle reconnect attempt
   */
  private handleReconnectAttempt = (attempt: number): void => {
    this.debug(`Reconnect attempt ${attempt}`);
    this.options.onReconnecting(attempt);
  };

  /**
   * Handle successful reconnection
   */
  private handleReconnect = (): void => {
    this.debug('Reconnected successfully');
    this.reconnectAttempts = 0;
    this.options.onReconnected();
  };

  /**
   * Handle failed reconnection
   */
  private handleReconnectFailed = (): void => {
    this.debug('Reconnect failed');
    this.options.onMaxReconnectReached();
  };

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    const maxAttempts = this.options.reconnectConfig.maxAttempts ?? this.defaultReconnectConfig.maxAttempts;
    if (this.reconnectAttempts >= maxAttempts) {
      this.debug('Max reconnection attempts reached');
      this.options.onMaxReconnectReached();
      return;
    }

    const delay = this.calculateReconnectDelay();
    this.reconnectAttempts++;

    this.debug(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeoutId = setTimeout(() => {
      if (!this.isManualDisconnect) {
        this.connect();
      }
    }, delay);
  }

  /**
   * Calculate reconnect delay with exponential backoff
   */
  private calculateReconnectDelay(): number {
    const config = this.options.reconnectConfig;
    const initialDelay = config.initialDelay ?? this.defaultReconnectConfig.initialDelay;
    const maxDelay = config.maxDelay ?? this.defaultReconnectConfig.maxDelay;
    const backoffMultiplier = config.backoffMultiplier ?? this.defaultReconnectConfig.backoffMultiplier;
    const randomDelayFactor = config.randomDelayFactor;

    // Exponential backoff
    let delay = initialDelay * Math.pow(backoffMultiplier, this.reconnectAttempts);

    // Add random jitter
    if (randomDelayFactor) {
      const jitter = delay * randomDelayFactor * (Math.random() * 2 - 1);
      delay += jitter;
    }

    // Clamp to max delay
    return Math.min(delay, maxDelay);
  }

  /**
   * Setup message tracking for acknowledgment and retry
   */
  private setupMessageTracking(): void {
    if (!this.socket) return;

    // Listen for acknowledgments
    this.socket.on('message_ack', (data: { messageId: string; status: string }) => {
      const pending = this.pendingMessages.get(data.messageId);
      if (pending) {
        clearTimeout(pending.timeoutId);
        this.pendingMessages.delete(data.messageId);
        pending.resolve(data);
      }
    });

    this.socket.on('message_nack', (data: { messageId: string; error: string }) => {
      const pending = this.pendingMessages.get(data.messageId);
      if (pending) {
        clearTimeout(pending.timeoutId);

        // Retry if attempts remaining
        const maxAttempts = this.options.retryConfig.maxAttempts ?? this.defaultRetryConfig.maxAttempts;
        if (pending.attempts < maxAttempts) {
          this.retryMessage(data.messageId);
        } else {
          this.pendingMessages.delete(data.messageId);
          pending.reject(new Error(data.error || 'Message failed'));
        }
      }
    });
  }

  /**
   * Send a message with retry and timeout
   */
  async sendWithRetry(
    event: string,
    data: any,
    options?: {
      timeout?: number;
      retries?: number;
    }
  ): Promise<any> {
    const messageId = `msg_${Date.now()}_${this.messageIdCounter++}`;

    return new Promise((resolve, reject) => {
      const config = this.options.retryConfig;
      const timeout = options?.timeout ?? config.timeout ?? this.defaultRetryConfig.timeout;
      const maxAttempts = config.maxAttempts ?? this.defaultRetryConfig.maxAttempts;

      const timeoutId = setTimeout(() => {
        this.pendingMessages.delete(messageId);

        // Retry on timeout
        if (this.pendingMessages.get(messageId)?.attempts! < maxAttempts) {
          this.retryMessage(messageId);
        } else {
          reject(new Error(`Message timeout after ${timeout}ms`));
        }
      }, timeout);

      this.pendingMessages.set(messageId, {
        event,
        data,
        attempts: 0,
        lastAttempt: Date.now(),
        timeoutId,
        resolve,
        reject,
      });

      // Send the message
      this.send(event, { ...data, messageId });
    });
  }

  /**
   * Retry a pending message
   */
  private retryMessage(messageId: string): void {
    const pending = this.pendingMessages.get(messageId);
    if (!pending) return;

    pending.attempts++;
    pending.lastAttempt = Date.now();

    // Calculate retry delay
    const config = this.options.retryConfig;
    const initialDelay = config.initialDelay ?? this.defaultRetryConfig.initialDelay;
    const backoffMultiplier = config.backoffMultiplier ?? this.defaultRetryConfig.backoffMultiplier;
    const maxDelay = config.maxDelay ?? this.defaultRetryConfig.maxDelay;

    const delay = Math.min(
      initialDelay * Math.pow(backoffMultiplier, pending.attempts),
      maxDelay
    );

    this.debug(`Retrying message ${messageId} (attempt ${pending.attempts}) after ${delay}ms`);

    setTimeout(() => {
      if (this.socket?.connected) {
        this.send(pending.event, { ...pending.data, messageId });
      }
    }, delay);
  }

  /**
   * Retry all pending messages
   */
  private retryPendingMessages(): void {
    const maxAttempts = this.options.retryConfig.maxAttempts ?? this.defaultRetryConfig.maxAttempts;
    for (const [messageId, pending] of this.pendingMessages.entries()) {
      if (pending.attempts < maxAttempts) {
        this.retryMessage(messageId);
      } else {
        // Max retries reached, reject
        clearTimeout(pending.timeoutId);
        this.pendingMessages.delete(messageId);
        pending.reject(new Error('Max retry attempts reached'));
      }
    }
  }

  /**
   * Send a message without retry
   */
  send(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
      this.debug(`Sent: ${event}`, data);
    } else {
      this.debug(`Cannot send ${event}: not connected`);
      throw new Error('WebSocket is not connected');
    }
  }

  /**
   * Register event listener
   */
  on(event: string, callback: EventCallback): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }

    this.eventListeners.get(event)!.add(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: EventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);

      if (this.socket) {
        this.socket.off(event, callback);
      }
    }
  }

  /**
   * Register one-time event listener
   */
  once(event: string, callback: EventCallback): void {
    if (this.socket) {
      this.socket.once(event, callback);
    }
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get connection state
   */
  get state(): 'disconnected' | 'connecting' | 'connected' | 'reconnecting' {
    if (!this.socket) return 'disconnected';
    if (this.socket.connected) return 'connected';
    if (this.reconnectAttempts > 0) return 'reconnecting';
    return 'connecting';
  }

  /**
   * Disconnect and prevent reconnection
   */
  disconnect(): void {
    this.isManualDisconnect = true;
    this.reconnectAttempts = 0;

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    // Clear pending message timeouts
    for (const pending of this.pendingMessages.values()) {
      clearTimeout(pending.timeoutId);
    }
    this.pendingMessages.clear();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.debug('Disconnected manually');
  }

  /**
   * Reconnect to server
   */
  reconnect(): void {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }

  /**
   * Update auth token
   */
  updateAuthToken(token: string): void {
    this.options.authToken = token;

    if (this.socket) {
      this.socket.auth = { token };
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    state: string;
    reconnectAttempts: number;
    pendingMessages: number;
    listeners: number;
  } {
    let totalListeners = 0;
    for (const listeners of this.eventListeners.values()) {
      totalListeners += listeners.size;
    }

    return {
      state: this.state,
      reconnectAttempts: this.reconnectAttempts,
      pendingMessages: this.pendingMessages.size,
      listeners: totalListeners,
    };
  }

  /**
   * Debug logging
   */
  private debug(...args: any[]): void {
    if (this.options.debug) {
      console.log('[WebSocketClient]', ...args);
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.disconnect();

    // Clear all event listeners
    this.eventListeners.clear();

    this.debug('WebSocket client destroyed');
  }
}

/**
 * Factory function to create a WebSocket client
 */
export function createWebSocketClient(options: WebSocketClientOptions): RobustWebSocketClient {
  return new RobustWebSocketClient(options);
}

/**
 * Singleton instance for the application
 */
let singletonClient: RobustWebSocketClient | null = null;

export function getWebSocketClient(
  options?: WebSocketClientOptions
): RobustWebSocketClient {
  if (!singletonClient && options) {
    singletonClient = new RobustWebSocketClient(options);
  }

  if (!singletonClient) {
    throw new Error('WebSocket client not initialized. Call getWebSocketClient with options first.');
  }

  return singletonClient;
}

export function destroyWebSocketClient(): void {
  if (singletonClient) {
    singletonClient.destroy();
    singletonClient = null;
  }
}
