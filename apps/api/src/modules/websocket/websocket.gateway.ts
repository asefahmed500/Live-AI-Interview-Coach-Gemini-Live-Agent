import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject } from '@nestjs/common';

import {
  StartSessionDto,
  AudioChunkDto,
  FrameAnalysisDto,
  InterruptDto,
  StopSessionDto,
} from './dtos';
import { SessionManagerService } from './services/session-manager.service';
import { WebSocketEvents } from './constants/websocket-events.constant';
import {
  GeminiException,
  GeminiInterruptedException,
  GeminiQuotaException,
  GeminiSafetyException,
  GeminiApiKeyException,
} from '../gemini/exceptions';
import { ConfidenceEngineService } from '../confidence/confidence-engine.service';

// Namespace for live interview sessions
@WebSocketGateway({
  namespace: '/live',
  cors: {
    origin: true,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
})
export class LiveInterviewGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LiveInterviewGateway.name);
  private connectedClients = new Map<string, Set<string>>();

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly winstonLogger: any,
    private readonly sessionManager: SessionManagerService,
    private readonly confidenceEngine: ConfidenceEngineService
  ) { }

  afterInit(_server: Server): void {
    this.logger.log('Live Interview Gateway initialized on namespace: /live');
    this.server.emit(WebSocketEvents.SERVER_READY, {
      message: 'Live interview server is ready',
      timestamp: new Date().toISOString(),
    });
  }

  handleConnection(client: Socket): void {
    const { id } = client;
    const userId = this.extractUserId(client);

    this.logger.log(`Client connected: ${id} | User: ${userId || 'anonymous'}`);

    // Track client
    if (!this.connectedClients.has(userId)) {
      this.connectedClients.set(userId, new Set());
    }
    this.connectedClients.get(userId)!.add(id);

    // Log connection details
    this.winstonLogger.log({
      message: 'WebSocket connection established',
      clientId: id,
      userId,
      ip: this.extractIp(client),
      userAgent: this.extractUserAgent(client),
      timestamp: new Date().toISOString(),
    });

    // Send welcome message
    client.emit(WebSocketEvents.CONNECTION_ESTABLISHED, {
      clientId: id,
      message: 'Connected to live interview server',
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(client: Socket): void {
    const { id } = client;
    const userId = this.extractUserId(client);

    this.logger.log(`Client disconnected: ${id} | User: ${userId || 'anonymous'}`);

    // Close all sessions for this socket
    this.sessionManager.closeSessionsBySocket(id).catch((err) => {
      this.logger.error(`Error closing sessions for socket ${id}: ${err.message}`);
    });

    // Remove from tracking
    if (this.connectedClients.has(userId)) {
      this.connectedClients.get(userId)!.delete(id);
      if (this.connectedClients.get(userId)!.size === 0) {
        this.connectedClients.delete(userId);
      }
    }

    // Log disconnection
    this.winstonLogger.log({
      message: 'WebSocket connection closed',
      clientId: id,
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Start a new interview session with Gemini
   */
  @SubscribeMessage(WebSocketEvents.START_SESSION)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleStartSession(
    @MessageBody() data: StartSessionDto,
    @ConnectedSocket() client: Socket
  ): Promise<void> {
    const { id } = client;
    const userId = this.extractUserId(client);
    const sessionId = data.sessionId || this.generateSessionId();
    const roomId = `session:${sessionId}`;

    this.logger.log(
      `START_SESSION from client ${id} | User: ${userId} | Session: ${sessionId} | Mode: ${data.mode || 'default'}`
    );

    let wsSession: any = null;
    try {
      // Create Gemini session via session manager
      wsSession = await this.sessionManager.createSession(id, roomId, {
        jobDescription: data.jobDescription,
        mode: data.mode,
        difficulty: data.difficulty,
        personality: data.personality,
      });

      // Join session room
      await client.join(roomId);

      // Log session start
      this.winstonLogger.log({
        message: 'Session started',
        clientId: id,
        userId,
        sessionId: wsSession.sessionId,
        jobDescription: data.jobDescription,
        mode: data.mode,
        difficulty: data.difficulty,
        personality: data.personality,
        timestamp: new Date().toISOString(),
      });

      // Send acknowledgment - use the internal Gemini session ID for consistency
      client.emit(WebSocketEvents.SESSION_STARTED, {
        sessionId: wsSession.sessionId, // Use internal session ID instead of generated ID
        roomId,
        message: 'Interview session started',
        mode: data.mode || 'mixed',
        difficulty: data.difficulty,
        personality: data.personality,
        timestamp: new Date().toISOString(),
      });

      // Send initial AI response
      this.sendAIResponse(client, wsSession.sessionId, {
        role: 'assistant',
        content: this.getInitialGreeting(data),
      });

      // Register session with confidence engine for tracking
      this.confidenceEngine.registerSession(wsSession.sessionId);
    } catch (error: any) {
      this.handleSessionError(client, wsSession?.sessionId || sessionId || 'unknown', 'START_SESSION', error);
    }
  }

  /**
   * Handle incoming audio chunk - stream to Gemini
   */
  @SubscribeMessage(WebSocketEvents.AUDIO_CHUNK)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleAudioChunk(
    @MessageBody() data: AudioChunkDto,
    @ConnectedSocket() client: Socket
  ): Promise<void> {
    const { id } = client;
    // const userId = this.extractUserId(client);

    if (!data.sessionId) {
      this.logger.warn(`AUDIO_CHUNK from client ${id} missing sessionId`);
      client.emit(WebSocketEvents.ERROR, {
        message: 'sessionId is required',
        code: 'MISSING_SESSION_ID',
      });
      return;
    }

    const wsSession = this.sessionManager.getSession(data.sessionId);

    if (!wsSession) {
      client.emit(WebSocketEvents.ERROR, {
        message: 'Session not found',
        sessionId: data.sessionId,
        code: 'SESSION_NOT_FOUND',
      });
      return;
    }

    // Verify ownership
    if (wsSession.socketId !== id) {
      client.emit(WebSocketEvents.ERROR, {
        message: 'Session does not belong to this client',
        sessionId: data.sessionId,
        code: 'SESSION_MISMATCH',
      });
      return;
    }

    // Check if session is active
    if (!this.sessionManager.isSessionActive(data.sessionId)) {
      client.emit(WebSocketEvents.ERROR, {
        message: 'Session is not active',
        sessionId: data.sessionId,
        code: 'SESSION_INACTIVE',
      });
      return;
    }

    try {
      // Log audio chunk
      this.logger.debug(
        `AUDIO_CHUNK from client ${id} | Session: ${data.sessionId} | Seq: ${data.sequenceNumber}`
      );

      // Add to transcript (user message)
      this.sessionManager.addTranscriptEntry(
        data.sessionId,
        'user',
        `[Audio chunk ${data.sequenceNumber}]`
      );

      // Process with Gemini with retry logic
      await this.processAudioWithGemini(client, data.sessionId, data);
    } catch (error: any) {
      this.handleSessionError(client, data.sessionId, 'AUDIO_CHUNK', error);
    }
  }

  /**
   * Handle video frame analysis
   */
  @SubscribeMessage(WebSocketEvents.FRAME_ANALYSIS)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleFrameAnalysis(
    @MessageBody() data: FrameAnalysisDto,
    @ConnectedSocket() client: Socket
  ): Promise<void> {
    const { id } = client;
    const userId = this.extractUserId(client);

    if (!data.sessionId) {
      this.logger.warn(`FRAME_ANALYSIS from client ${id} missing sessionId`);
      client.emit(WebSocketEvents.ERROR, {
        message: 'sessionId is required',
        code: 'MISSING_SESSION_ID',
      });
      return;
    }

    // Log frame analysis
    this.logger.debug(
      `FRAME_ANALYSIS from client ${id} | Session: ${data.sessionId} | Frame: ${data.frameNumber}`
    );

    try {
      // Verify session exists
      const wsSession = this.sessionManager.getSession(data.sessionId);
      if (!wsSession) {
        client.emit(WebSocketEvents.ERROR, {
          message: 'Session not found',
          sessionId: data.sessionId,
          code: 'SESSION_NOT_FOUND',
        });
        return;
      }

      // Check if session is active
      if (!this.sessionManager.isSessionActive(data.sessionId)) {
        client.emit(WebSocketEvents.ERROR, {
          message: 'Session is not active',
          sessionId: data.sessionId,
          code: 'SESSION_INACTIVE',
        });
        return;
      }

      // Analyze frame with Gemini Vision API
      const analysis = await this.sessionManager.analyzeFrame({
        sessionId: data.sessionId,
        imageData: data.frameData,
        format: data.format,
      });

      // Calculate overall confidence score (weighted average)
      const confidenceWeights = { eyeContact: 0.4, posture: 0.3, engagement: 0.3 };
      const calculatedConfidence = Math.round(
        analysis.eyeContact * confidenceWeights.eyeContact +
        analysis.posture * confidenceWeights.posture +
        analysis.engagement * confidenceWeights.engagement
      );

      // Store frame analysis results in session
      this.sessionManager.addFrameAnalysis(data.sessionId, {
        frameNumber: data.frameNumber,
        timestamp: data.timestamp || Date.now(),
        eyeContact: analysis.eyeContact,
        posture: analysis.posture,
        engagement: analysis.engagement,
        confidence: calculatedConfidence,
        suggestions: analysis.suggestions,
      });

      // Emit confidence update to client
      client.emit(WebSocketEvents.CONFIDENCE_UPDATE, {
        sessionId: data.sessionId,
        confidence: calculatedConfidence,
        breakdown: {
          eyeContact: analysis.eyeContact,
          posture: analysis.posture,
          engagement: analysis.engagement,
        },
        suggestions: analysis.suggestions,
        frameNumber: data.frameNumber,
        timestamp: new Date().toISOString(),
      });

      // Emit frame processed acknowledgment
      client.emit(WebSocketEvents.FRAME_PROCESSED, {
        sessionId: data.sessionId,
        frameNumber: data.frameNumber,
        confidence: calculatedConfidence,
        timestamp: new Date().toISOString(),
      });

      // Log frame analysis result
      this.winstonLogger.debug({
        message: 'Frame analyzed',
        clientId: id,
        userId,
        sessionId: data.sessionId,
        frameNumber: data.frameNumber,
        confidence: calculatedConfidence,
        breakdown: {
          eyeContact: analysis.eyeContact,
          posture: analysis.posture,
          engagement: analysis.engagement,
        },
        suggestions: analysis.suggestions,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      this.handleSessionError(client, data.sessionId, 'FRAME_ANALYSIS', error);
    }
  }

  /**
   * Handle session interrupt
   */
  @SubscribeMessage(WebSocketEvents.INTERRUPT)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleInterrupt(
    @MessageBody() data: InterruptDto,
    @ConnectedSocket() client: Socket
  ): Promise<void> {
    const { id } = client;
    const userId = this.extractUserId(client);

    if (!data.sessionId) {
      client.emit(WebSocketEvents.ERROR, {
        message: 'sessionId is required',
        code: 'MISSING_SESSION_ID',
      });
      return;
    }

    this.logger.log(
      `INTERRUPT from client ${id} | Session: ${data.sessionId} | Reason: ${data.reason}`
    );

    try {
      // Update session status
      this.sessionManager.updateStatus(data.sessionId, 'interrupted');
      this.sessionManager.setStreamingState(data.sessionId, false);

      // Clear audio buffer
      this.sessionManager.clearAudioBuffer(data.sessionId);

      // Interrupt Gemini session
      await this.sessionManager.getSession(data.sessionId)?.abortController.abort();

      // Log interrupt
      this.winstonLogger.warn({
        message: 'Session interrupted',
        clientId: id,
        userId,
        sessionId: data.sessionId,
        reason: data.reason,
        errorCode: data.errorCode,
        timestamp: new Date().toISOString(),
      });

      // Emit interrupt acknowledgment
      client.emit(WebSocketEvents.INTERRUPT_ACK, {
        sessionId: data.sessionId,
        reason: data.reason,
        message: 'Interrupt acknowledged',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      this.handleSessionError(client, data.sessionId, 'INTERRUPT', error);
    }
  }

  /**
   * Stop interview session
   */
  @SubscribeMessage(WebSocketEvents.STOP_SESSION)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleStopSession(
    @MessageBody() data: StopSessionDto,
    @ConnectedSocket() client: Socket
  ): Promise<void> {
    const { id } = client;
    const userId = this.extractUserId(client);

    if (!data.sessionId) {
      client.emit(WebSocketEvents.ERROR, {
        message: 'sessionId is required',
        code: 'MISSING_SESSION_ID',
      });
      return;
    }

    this.logger.log(
      `STOP_SESSION from client ${id} | Session: ${data.sessionId} | Reason: ${data.reason}`
    );

    try {
      const wsSession = this.sessionManager.getSession(data.sessionId);

      if (!wsSession) {
        client.emit(WebSocketEvents.ERROR, {
          message: 'Session not found',
          sessionId: data.sessionId,
          code: 'SESSION_NOT_FOUND',
        });
        return;
      }

      // Leave session room
      const roomId = `session:${data.sessionId}`;
      await client.leave(roomId);

      // Generate and send final feedback if requested
      if (data.generateReport) {
        const transcript = this.sessionManager.getTranscript(data.sessionId);
        await this.sendFinalFeedback(client, data.sessionId, transcript);
      }

      // Close session
      await this.sessionManager.closeSession(data.sessionId);

      // Unregister from confidence engine
      this.confidenceEngine.unregisterSession(data.sessionId);

      // Log session stop
      this.winstonLogger.log({
        message: 'Session stopped',
        clientId: id,
        userId,
        sessionId: data.sessionId,
        reason: data.reason,
        saveTranscript: data.saveTranscript,
        generateReport: data.generateReport,
        timestamp: new Date().toISOString(),
      });

      // Send session summary
      client.emit(WebSocketEvents.SESSION_ENDED, {
        sessionId: data.sessionId,
        reason: data.reason,
        message: 'Interview session ended',
        transcriptSaved: data.saveTranscript,
        reportGenerated: data.generateReport,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      this.handleSessionError(client, data.sessionId, 'STOP_SESSION', error);
    }
  }

  /**
   * Process audio with Gemini with retry logic
   */
  private async processAudioWithGemini(
    client: Socket,
    sessionId: string,
    data: AudioChunkDto
  ): Promise<void> {
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        // Check if session is still active
        if (!this.sessionManager.isSessionActive(sessionId)) {
          this.logger.warn(`Session ${sessionId} no longer active, skipping audio processing`);
          return;
        }

        // Check if session is already streaming
        if (this.sessionManager.isStreaming(sessionId)) {
          this.logger.debug(`Session ${sessionId} is already streaming, queuing audio`);
          // Add to buffer for later processing
          const audioData = Buffer.from(data.chunkData, 'base64');
          this.sessionManager.addAudioToBuffer(
            sessionId,
            data.sequenceNumber,
            audioData.buffer,
            data.timestamp || Date.now()
          );
          client.emit(WebSocketEvents.AUDIO_RECEIVED, {
            sessionId,
            sequenceNumber: data.sequenceNumber,
            queued: true,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Set streaming state
        this.sessionManager.setStreamingState(sessionId, true);
        this.sessionManager.resetErrors(sessionId);

        // Get the Gemini session
        const wsSession = this.sessionManager.getSession(sessionId);
        if (!wsSession) return;

        // Decode audio data
        const audioData = Buffer.from(data.chunkData, 'base64');

        // Stream to Gemini and handle response
        const responseStream = this.sessionManager.streamAudio({
          sessionId,
          audioData: audioData.buffer,
          mimeType: data.codec || 'audio/webm',
          endOfUtterance: data.sequenceNumber % 10 === 0, // Every 10th chunk
        });

        // Process streaming response
        for await (const chunk of responseStream) {
          // Send partial transcript
          if (chunk.text) {
            client.emit(WebSocketEvents.TRANSCRIPT_PARTIAL, {
              sessionId,
              text: chunk.text,
              done: chunk.done,
            });

            // Add to transcript
            this.sessionManager.addTranscriptEntry(sessionId, 'assistant', chunk.text);

            // If done, send final AI response
            if (chunk.done) {
              this.sendAIResponse(client, sessionId, {
                role: 'assistant',
                content: chunk.text,
              });
            }
          }
        }

        // Reset streaming state
        this.sessionManager.setStreamingState(sessionId, false);
        this.sessionManager.resetRetry(sessionId);

        // Emit acknowledgment
        client.emit(WebSocketEvents.AUDIO_RECEIVED, {
          sessionId,
          sequenceNumber: data.sequenceNumber,
          timestamp: new Date().toISOString(),
        });

        return; // Success, exit retry loop
      } catch (error: any) {
        retryCount++;

        // Don't retry certain errors
        if (error instanceof GeminiSafetyException || error instanceof GeminiApiKeyException) {
          throw error; // Re-throw
        }

        // Log retry
        this.logger.warn(
          `Audio processing failed (attempt ${retryCount}/${maxRetries}): ${error.message}`
        );

        this.sessionManager.incrementRetry(sessionId);
        this.sessionManager.recordError(sessionId, error.message);

        // Check if we can retry
        if (!this.sessionManager.canRetry(sessionId)) {
          throw new GeminiException(
            `Max retries exceeded for session ${sessionId}`,
            500,
            'MAX_RETRIES_EXCEEDED'
          );
        }

        // Wait before retry
        await this.delay(1000 * retryCount);
      }
    }
  }

  /**
   * Handle session errors
   */
  private handleSessionError(
    client: Socket,
    sessionId: string,
    operation: string,
    error: any
  ): void {
    this.logger.error(`Error in ${operation} for session ${sessionId}: ${error.message}`);

    // Log error details
    this.winstonLogger.error({
      message: `WebSocket ${operation} error`,
      sessionId,
      operation,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    // Determine error type
    let errorCode = 'SESSION_ERROR';

    if (error instanceof GeminiQuotaException) {
      errorCode = 'QUOTA_EXCEEDED';
    } else if (error instanceof GeminiSafetyException) {
      errorCode = 'SAFETY_VIOLATION';
    } else if (error instanceof GeminiInterruptedException) {
      errorCode = 'INTERRUPTED';
    }

    // Emit error to client
    client.emit(WebSocketEvents.ERROR, {
      sessionId,
      message: error.message || 'An error occurred',
      code: errorCode,
      timestamp: new Date().toISOString(),
    });

    // Update session error state
    this.sessionManager.recordError(sessionId, error.message);

    // Check if session should be closed due to errors
    if (this.sessionManager.hasTooManyErrors(sessionId)) {
      this.logger.error(`Session ${sessionId} has too many errors, closing`);
      this.sessionManager.closeSession(sessionId).catch((err) => {
        this.logger.error(`Error closing session ${sessionId}: ${err.message}`);
      });
    }
  }

  /**
   * Send AI response to client
   */
  private sendAIResponse(
    client: Socket,
    sessionId: string,
    data: { role: string; content: string; metadata?: any }
  ): void {
    client.emit(WebSocketEvents.AI_RESPONSE, {
      sessionId,
      ...data,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(`AI response sent for session ${sessionId}`);
  }

  /**
   * Send final feedback with real confidence data and session summary
   */
  private async sendFinalFeedback(
    client: Socket,
    sessionId: string,
    transcript: Array<{ role: string; content: string; timestamp: number }>
  ): Promise<void> {
    try {
      // Calculate final confidence score
      const scoringResult = await this.confidenceEngine.calculateConfidence(sessionId);

      // Get frame analysis summary
      const frameAnalyses = this.sessionManager.getSession(sessionId)?.frameAnalyses || [];
      const avgEyeContact = frameAnalyses.length > 0
        ? Math.round(frameAnalyses.reduce((s, f) => s + f.eyeContact, 0) / frameAnalyses.length)
        : 0;
      const avgPosture = frameAnalyses.length > 0
        ? Math.round(frameAnalyses.reduce((s, f) => s + f.posture, 0) / frameAnalyses.length)
        : 0;
      const avgEngagement = frameAnalyses.length > 0
        ? Math.round(frameAnalyses.reduce((s, f) => s + f.engagement, 0) / frameAnalyses.length)
        : 0;

      // Build strengths and weaknesses from scoring
      const strengths: string[] = [];
      const weaknesses: string[] = [];

      if (scoringResult.breakdown.speechClarity >= 70) strengths.push('Clear and articulate communication');
      else weaknesses.push('Speech clarity needs improvement');

      if (scoringResult.breakdown.eyeContact >= 70) strengths.push('Strong eye contact with camera');
      else weaknesses.push('Improve eye contact with the camera');

      if (scoringResult.breakdown.posture >= 70) strengths.push('Confident body language');
      else weaknesses.push('Work on maintaining upright posture');

      if (scoringResult.breakdown.fillerWords >= 70) strengths.push('Minimal use of filler words');
      else weaknesses.push('Reduce filler words (um, uh, like)');

      // Emit comprehensive feedback event
      client.emit(WebSocketEvents.FEEDBACK_GENERATED, {
        sessionId,
        overallScore: scoringResult.score,
        breakdown: scoringResult.breakdown,
        visionBreakdown: {
          eyeContact: avgEyeContact,
          posture: avgPosture,
          engagement: avgEngagement,
        },
        strengths,
        weaknesses,
        suggestions: scoringResult.suggestions,
        totalQuestions: transcript.filter(t => t.role === 'assistant').length,
        totalResponses: transcript.filter(t => t.role === 'user').length,
        totalFramesAnalyzed: frameAnalyses.length,
        feedback: `Interview completed! Your overall confidence score was ${scoringResult.score}%. ${strengths.length > 0 ? 'Strengths: ' + strengths.join(', ') + '.' : ''} ${weaknesses.length > 0 ? 'Areas to improve: ' + weaknesses.join(', ') + '.' : ''}`,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Final feedback sent for session ${sessionId}: score ${scoringResult.score}%`);
    } catch (error: any) {
      this.logger.error(`Error generating final feedback for ${sessionId}: ${error.message}`);
      // Fallback to basic feedback
      client.emit(WebSocketEvents.FEEDBACK_GENERATED, {
        sessionId,
        feedback: 'Interview completed. Thank you for practicing!',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Extract user ID from socket auth or handshake
   */
  private extractUserId(client: Socket): string {
    return (
      (client.handshake.auth as any)?.userId ||
      (client.handshake.query as any)?.userId ||
      'anonymous'
    );
  }

  /**
   * Extract IP address from socket
   */
  private extractIp(client: Socket): string {
    return (
      (client.handshake.headers as any)['x-forwarded-for']?.split(',')[0] ||
      (client.handshake.headers as any)['x-real-ip'] ||
      client.handshake.address ||
      'unknown'
    );
  }

  /**
   * Extract user agent from socket
   */
  private extractUserAgent(client: Socket): string {
    return (client.handshake.headers as any)['user-agent'] || 'unknown';
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Generate initial AI greeting based on job description
   */
  private getInitialGreeting(data: StartSessionDto): string {
    const greetings = {
      technical: `Hello! I'm ready to help you practice for this technical position. Let's begin with a technical question related to the role.`,
      behavioral: `Hello! I'll be conducting a behavioral interview for this position. Let's explore your experiences and how you handle various work situations.`,
      mixed: `Hello! I'll be asking both technical and behavioral questions during this interview practice. Let's get started!`,
    };

    return greetings[data.mode || 'mixed'] || greetings.mixed;
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
