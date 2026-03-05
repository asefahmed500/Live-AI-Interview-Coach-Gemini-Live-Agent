import { io, Socket } from 'socket.io-client';
import { WS_EVENTS } from '@/types-shared';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

class WebSocketClient {
  private socket: Socket | null = null;
  private url: string;

  constructor(url: string = WS_URL) {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(this.url, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        reject(error);
      });

      this.socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: (...args: unknown[]) => void): void {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: unknown[]) => void): void {
    if (callback) {
      this.socket?.off(event, callback);
    } else {
      this.socket?.off(event);
    }
  }

  emit(event: string, data?: unknown): void {
    this.socket?.emit(event, data);
  }

  joinSession(sessionId: string): void {
    this.emit(WS_EVENTS.JOIN_SESSION, { sessionId });
  }

  leaveSession(sessionId: string): void {
    this.emit(WS_EVENTS.LEAVE_SESSION, { sessionId });
  }

  startSession(): void {
    this.emit(WS_EVENTS.START_SESSION);
  }

  pauseSession(): void {
    this.emit(WS_EVENTS.PAUSE_SESSION);
  }

  resumeSession(): void {
    this.emit(WS_EVENTS.RESUME_SESSION);
  }

  endSession(): void {
    this.emit(WS_EVENTS.END_SESSION);
  }

  sendMessage(message: string): void {
    this.emit(WS_EVENTS.SEND_MESSAGE, { message });
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const ws = new WebSocketClient();
