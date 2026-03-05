import { Injectable, Logger, Optional, OnModuleDestroy } from '@nestjs/common';
import { GeminiService } from '../../gemini';
import { GeminiSession } from '../../gemini/interfaces';

/**
 * Extended session info for WebSocket tracking
 */
export interface WebSocketSession extends GeminiSession {
  socketId: string;
  roomId: string;
  isStreaming: boolean;
  transcript: Array<{ role: string; content: string; timestamp: number }>;
  audioBuffer: Array<{ sequence: number; data: ArrayBuffer; timestamp: number }>;
  frameAnalyses: Array<{
    frameNumber: number;
    timestamp: number;
    eyeContact: number;
    posture: number;
    engagement: number;
    confidence: number;
    suggestions: string[];
  }>;
  retryCount: number;
  lastError?: string;
  consecutiveErrors: number;
}

@Injectable()
export class SessionManagerService implements OnModuleDestroy {
  private readonly logger = new Logger(SessionManagerService.name);
  private readonly wsSessions = new Map<string, WebSocketSession>();
  private readonly socketToSession = new Map<string, string>(); // socketId -> sessionId
  private readonly roomToSession = new Map<string, string>(); // roomId -> sessionId

  // Configuration
  private readonly MAX_RETRIES = 3;
  private readonly MAX_CONSECUTIVE_ERRORS = 5;
  private readonly RETRY_DELAY = 1000;
  private readonly SESSION_TIMEOUT = 300000; // 5 minutes
  private readonly MAX_AUDIO_BUFFER_SIZE = 100;

  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(@Optional() private readonly geminiService?: GeminiService) {
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanupStaleSessions(), 60000); // Every minute
  }

  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Create a new WebSocket session with Gemini
   */
  async createSession(
    socketId: string,
    roomId: string,
    options: {
      jobDescription: string;
      mode?: 'technical' | 'behavioral' | 'mixed';
      difficulty?: 'junior' | 'mid' | 'senior' | 'lead';
      personality?: 'friendly' | 'aggressive' | 'vc';
    }
  ): Promise<WebSocketSession> {
    try {
      if (!this.geminiService) {
        throw new Error('GeminiService is not available');
      }

      // Create Gemini session
      const geminiSession = await this.geminiService.createSession({
        jobDescription: options.jobDescription,
        mode: options.mode,
        difficulty: options.difficulty,
        personality: options.personality,
      });

      // Create extended WebSocket session
      const wsSession: WebSocketSession = {
        ...geminiSession,
        socketId,
        roomId,
        isStreaming: false,
        transcript: [],
        audioBuffer: [],
        frameAnalyses: [],
        retryCount: 0,
        consecutiveErrors: 0,
      };

      // Store mappings
      this.wsSessions.set(geminiSession.sessionId, wsSession);
      this.socketToSession.set(socketId, geminiSession.sessionId);
      this.roomToSession.set(roomId, geminiSession.sessionId);

      this.logger.log(
        `Session created: ${geminiSession.sessionId} | Socket: ${socketId} | Room: ${roomId}`
      );

      return wsSession;
    } catch (error: any) {
      this.logger.error(`Failed to create session for socket ${socketId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get session by various identifiers
   */
  getSession(sessionId: string): WebSocketSession | undefined {
    return this.wsSessions.get(sessionId);
  }

  getSessionBySocket(socketId: string): WebSocketSession | undefined {
    const sessionId = this.socketToSession.get(socketId);
    return sessionId ? this.wsSessions.get(sessionId) : undefined;
  }

  getSessionByRoom(roomId: string): WebSocketSession | undefined {
    const sessionId = this.roomToSession.get(roomId);
    return sessionId ? this.wsSessions.get(sessionId) : undefined;
  }

  /**
   * Check if session is active and streaming
   */
  isSessionActive(sessionId: string): boolean {
    const session = this.wsSessions.get(sessionId);
    return session?.status === 'active' || false;
  }

  /**
   * Check if session is currently streaming
   */
  isStreaming(sessionId: string): boolean {
    const session = this.wsSessions.get(sessionId);
    return session?.isStreaming || false;
  }

  /**
   * Set streaming state
   */
  setStreamingState(sessionId: string, isStreaming: boolean): void {
    const session = this.wsSessions.get(sessionId);
    if (session) {
      session.isStreaming = isStreaming;
      session.lastActivityAt = new Date();
    }
  }

  /**
   * Add transcript entry
   */
  addTranscriptEntry(sessionId: string, role: string, content: string): void {
    const session = this.wsSessions.get(sessionId);
    if (session) {
      session.transcript.push({
        role,
        content,
        timestamp: Date.now(),
      });
      session.lastActivityAt = new Date();
    }
  }

  /**
   * Add frame analysis result
   */
  addFrameAnalysis(
    sessionId: string,
    analysis: {
      frameNumber: number;
      timestamp: number;
      eyeContact: number;
      posture: number;
      engagement: number;
      confidence: number;
      suggestions: string[];
    }
  ): void {
    const session = this.wsSessions.get(sessionId);
    if (session) {
      session.frameAnalyses.push(analysis);
      session.lastActivityAt = new Date();

      // Keep only last 100 frame analyses to prevent memory bloat
      if (session.frameAnalyses.length > 100) {
        session.frameAnalyses = session.frameAnalyses.slice(-100);
      }

      this.logger.debug(
        `Frame analysis added for session ${sessionId}: frame ${analysis.frameNumber}, confidence ${analysis.confidence}%`
      );
    }
  }

  /**
   * Get frame analyses for a session
   */
  getFrameAnalyses(sessionId: string): Array<{
    frameNumber: number;
    timestamp: number;
    eyeContact: number;
    posture: number;
    engagement: number;
    confidence: number;
    suggestions: string[];
  }> {
    const session = this.wsSessions.get(sessionId);
    return session?.frameAnalyses || [];
  }

  /**
   * Get average confidence score from frame analyses
   */
  getAverageConfidence(sessionId: string): number {
    const session = this.wsSessions.get(sessionId);
    if (!session || session.frameAnalyses.length === 0) {
      return 0;
    }

    const total = session.frameAnalyses.reduce((sum, a) => sum + a.confidence, 0);
    return Math.round(total / session.frameAnalyses.length);
  }

  /**
   * Add audio to buffer
   */
  addAudioToBuffer(
    sessionId: string,
    sequence: number,
    data: ArrayBuffer,
    timestamp: number
  ): void {
    const session = this.wsSessions.get(sessionId);
    if (!session) return;

    // Add to buffer
    session.audioBuffer.push({ sequence, data, timestamp });

    // Keep buffer size manageable
    if (session.audioBuffer.length > this.MAX_AUDIO_BUFFER_SIZE) {
      session.audioBuffer.shift(); // Remove oldest
    }

    session.lastActivityAt = new Date();
  }

  /**
   * Get and clear audio buffer
   */
  getAudioBuffer(
    sessionId: string
  ): Array<{ sequence: number; data: ArrayBuffer; timestamp: number }> {
    const session = this.wsSessions.get(sessionId);
    if (!session) return [];

    const buffer = [...session.audioBuffer];
    session.audioBuffer = [];
    return buffer;
  }

  /**
   * Clear audio buffer
   */
  clearAudioBuffer(sessionId: string): void {
    const session = this.wsSessions.get(sessionId);
    if (session) {
      session.audioBuffer = [];
    }
  }

  /**
   * Increment retry count
   */
  incrementRetry(sessionId: string): number {
    const session = this.wsSessions.get(sessionId);
    if (session) {
      session.retryCount++;
      return session.retryCount;
    }
    return 0;
  }

  /**
   * Check if retries are available
   */
  canRetry(sessionId: string): boolean {
    const session = this.wsSessions.get(sessionId);
    if (!session) return false;
    return session.retryCount < this.MAX_RETRIES;
  }

  /**
   * Reset retry count
   */
  resetRetry(sessionId: string): void {
    const session = this.wsSessions.get(sessionId);
    if (session) {
      session.retryCount = 0;
    }
  }

  /**
   * Record error
   */
  recordError(sessionId: string, error: string): void {
    const session = this.wsSessions.get(sessionId);
    if (session) {
      session.lastError = error;
      session.consecutiveErrors++;
      session.lastActivityAt = new Date();

      // Too many consecutive errors
      if (session.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
        this.logger.error(
          `Session ${sessionId} has too many consecutive errors: ${session.consecutiveErrors}`
        );
      }
    }
  }

  /**
   * Reset consecutive errors
   */
  resetErrors(sessionId: string): void {
    const session = this.wsSessions.get(sessionId);
    if (session) {
      session.consecutiveErrors = 0;
      session.lastError = undefined;
    }
  }

  /**
   * Check if session has too many errors
   */
  hasTooManyErrors(sessionId: string): boolean {
    const session = this.wsSessions.get(sessionId);
    if (!session) return false;
    return session.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS;
  }

  /**
   * Update session status
   */
  updateStatus(
    sessionId: string,
    status: 'initializing' | 'active' | 'interrupted' | 'closed'
  ): void {
    const session = this.wsSessions.get(sessionId);
    if (session) {
      session.status = status;
      session.lastActivityAt = new Date();
    }
  }

  /**
   * Analyze video frame using Gemini Vision API
   * Delegate method to expose gemini service capability
   */
  async analyzeFrame(options: { sessionId: string; imageData: string; format?: string }) {
    if (!this.geminiService) {
      throw new Error('GeminiService is not available');
    }
    return this.geminiService.analyzeFrame(options);
  }

  /**
   * Stream audio to Gemini Live API and get response
   * Delegate method to expose gemini service capability
   */
  async *streamAudio(options: {
    sessionId: string;
    audioData: string | ArrayBuffer;
    mimeType?: string;
    audioCodec?: string;
    sampleRate?: number;
    language?: string;
    endOfUtterance?: boolean;
  }): AsyncGenerator<{
    text: string;
    done: boolean;
    audioChunk?: string;
    metadata?: {
      sessionId: string;
      startTime: number;
      endTime: number;
      latency: number;
      model?: string;
      tokensUsed?: number;
    };
  }> {
    if (!this.geminiService) {
      throw new Error('GeminiService is not available');
    }

    // Convert to ArrayBuffer if needed
    let audioDataBuffer: ArrayBuffer;
    if (typeof options.audioData === 'string') {
      // Convert base64 string to ArrayBuffer
      audioDataBuffer = Buffer.from(options.audioData, 'base64').buffer;
    } else {
      audioDataBuffer = options.audioData;
    }

    // Forward to gemini service
    for await (const chunk of this.geminiService.streamAudio({
      sessionId: options.sessionId,
      audioData: audioDataBuffer,
      mimeType: options.mimeType || options.audioCodec || 'audio/webm',
    })) {
      yield {
        text: chunk.text,
        done: chunk.done,
        metadata: chunk.metadata as {
          sessionId: string;
          startTime: number;
          endTime: number;
          latency: number;
          model?: string;
          tokensUsed?: number;
        },
      };
    }
  }

  /**
   * Get session transcript
   */
  getTranscript(sessionId: string): Array<{ role: string; content: string; timestamp: number }> {
    const session = this.wsSessions.get(sessionId);
    return session?.transcript || [];
  }

  /**
   * Get all active sessions for a socket
   */
  getSessionsBySocket(socketId: string): WebSocketSession[] {
    const sessions: WebSocketSession[] = [];
    for (const [sessionId, session] of this.wsSessions.entries()) {
      if (session.socketId === socketId && session.status !== 'closed') {
        sessions.push(session);
      }
    }
    return sessions;
  }

  /**
   * Close a session
   */
  async closeSession(sessionId: string): Promise<void> {
    const session = this.wsSessions.get(sessionId);
    if (!session) return;

    try {
      // Close Gemini session
      if (this.geminiService) {
        await this.geminiService.closeSession(sessionId);
      }

      // Remove mappings
      this.socketToSession.delete(session.socketId);
      this.roomToSession.delete(session.roomId);
      this.wsSessions.delete(sessionId);

      this.logger.log(`Session closed: ${sessionId}`);
    } catch (error: any) {
      this.logger.error(`Error closing session ${sessionId}: ${error.message}`);
      // Still remove from tracking
      this.socketToSession.delete(session.socketId);
      this.roomToSession.delete(session.roomId);
      this.wsSessions.delete(sessionId);
    }
  }

  /**
   * Close all sessions for a socket
   */
  async closeSessionsBySocket(socketId: string): Promise<void> {
    const sessions = this.getSessionsBySocket(socketId);
    await Promise.all(sessions.map((s) => this.closeSession(s.sessionId)));
  }

  /**
   * Close all sessions in a room
   */
  async closeSessionsByRoom(roomId: string): Promise<void> {
    const session = this.getSessionByRoom(roomId);
    if (session) {
      await this.closeSession(session.sessionId);
    }
  }

  /**
   * Cleanup stale sessions
   */
  private async cleanupStaleSessions(): Promise<void> {
    const now = Date.now();
    const toClose: string[] = [];

    for (const [sessionId, session] of this.wsSessions.entries()) {
      const age = now - session.lastActivityAt.getTime();

      // Close inactive sessions
      if (age > this.SESSION_TIMEOUT) {
        toClose.push(sessionId);
      }

      // Close sessions with too many errors
      if (this.hasTooManyErrors(sessionId)) {
        toClose.push(sessionId);
      }

      // Close interrupted sessions that haven't resumed
      if (session.status === 'interrupted' && age > 30000) {
        toClose.push(sessionId);
      }
    }

    for (const sessionId of toClose) {
      await this.closeSession(sessionId);
    }

    if (toClose.length > 0) {
      this.logger.log(`Cleaned up ${toClose.length} stale sessions`);
    }
  }

  /**
   * Get session statistics
   */
  getStats(): {
    totalSessions: number;
    activeSessions: number;
    streamingSessions: number;
    totalMessages: number;
    totalTokens: number;
  } {
    let activeSessions = 0;
    let streamingSessions = 0;
    let totalMessages = 0;
    let totalTokens = 0;

    for (const session of this.wsSessions.values()) {
      if (session.status === 'active') {
        activeSessions++;
      }
      if (session.isStreaming) {
        streamingSessions++;
      }
      totalMessages += session.messageCount;
      totalTokens += session.totalTokens;
    }

    return {
      totalSessions: this.wsSessions.size,
      activeSessions,
      streamingSessions,
      totalMessages,
      totalTokens,
    };
  }
}
