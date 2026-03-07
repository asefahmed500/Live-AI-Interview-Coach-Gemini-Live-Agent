import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import {
  GeminiSession,
  StreamMetadata,
  CreateSessionOptions,
  StreamAudioOptions,
} from './interfaces';
import {
  GeminiException,
  GeminiApiKeyException,
  GeminiQuotaException,
  GeminiSessionException,
  GeminiStreamException,
  GeminiInterruptedException,
  GeminiSafetyException,
} from './exceptions';
import { buildGroundedSystemInstruction, validatePromptContext, PromptContext } from './prompts';

interface LiveSession {
  sessionId: string;
  jobDescription: string;
  model: string;
  createdAt: Date;
  lastActivityAt: Date;
  status: 'initializing' | 'active' | 'interrupted' | 'closed';
  abortController: AbortController;
  messageCount: number;
  totalTokens: number;
  totalLatency: number;
  responseQueue: LiveServerMessage[];
  resolveNextMessage: ((value: LiveServerMessage) => void) | null;
  isConnected: boolean;
}

@Injectable()
export class GeminiService implements OnModuleDestroy {
  private readonly logger = new Logger(GeminiService.name);
  private readonly ai: GoogleGenAI;
  private readonly sessions = new Map<string, LiveSession>();
  private readonly defaultModel = 'gemini-2.5-flash-native-audio-preview-12-2025';
  private readonly enableLogging: boolean;
  private readonly enableMetrics: boolean;
  private readonly defaultTimeout: number;

  constructor(
    @Inject(ConfigService)
  
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly winstonLogger: any
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!apiKey) {
      throw new GeminiApiKeyException('GEMINI_API_KEY is not configured');
    }

    if (apiKey === 'your-gemini-api-key' || apiKey.length < 20) {
      throw new GeminiApiKeyException('Invalid Gemini API key configured');
    }

    this.ai = new GoogleGenAI({ apiKey });
    this.enableLogging = this.configService.get<boolean>('GEMINI_ENABLE_LOGGING', true);
    this.enableMetrics = this.configService.get<boolean>('GEMINI_ENABLE_METRICS', true);
    this.defaultTimeout = this.configService.get<number>('GEMINI_TIMEOUT', 120000);

    this.logger.log('GeminiService initialized with Live API support');
  }

  async createSession(options: CreateSessionOptions): Promise<GeminiSession> {
    const startTime = Date.now();
    const sessionId = `gemini_${uuidv4()}`;

    try {
      const model = options.model || this.defaultModel;

      try {
        const promptContext: PromptContext = {
          jobDescription: options.jobDescription,
          mode: options.mode || 'mixed',
          difficulty: options.difficulty,
          personality: options.personality,
        };
        validatePromptContext(promptContext);
      } catch (validationError: any) {
        this.logger.warn(`Job description validation warning: ${validationError.message}`);
      }

      const systemInstruction = buildGroundedSystemInstruction({
        jobDescription: options.jobDescription,
        mode: options.mode || 'mixed',
        difficulty: options.difficulty,
        personality: options.personality,
      });

      this.logPrompt(sessionId, 'SYSTEM', systemInstruction);

      const abortController = new AbortController();

      const session: LiveSession = {
        sessionId,
        jobDescription: options.jobDescription,
        model,
        createdAt: new Date(),
        lastActivityAt: new Date(),
        status: 'initializing',
        abortController,
        messageCount: 0,
        totalTokens: 0,
        totalLatency: 0,
        responseQueue: [],
        resolveNextMessage: null,
        isConnected: false,
      };

      this.sessions.set(sessionId, session);

      session.status = 'active';

      const latency = Date.now() - startTime;
      session.totalLatency += latency;

      this.logMetrics(sessionId, {
        action: 'create_session',
        latency,
        model,
        mode: options.mode,
        difficulty: options.difficulty,
      });

      this.logger.log(`Gemini Live session created: ${sessionId}`);

      return session as unknown as GeminiSession;
    } catch (error: any) {
      this.handleError(sessionId || 'unknown', 'createSession', error);
    }
  }

  async *streamAudio(options: StreamAudioOptions): AsyncGenerator<{
    text: string;
    done: boolean;
    metadata?: StreamMetadata;
  }> {
    const session = this.sessions.get(options.sessionId);
    if (!session) {
      throw new GeminiSessionException(options.sessionId, 'Session not found');
    }

    const startTime = Date.now();

    try {
      if (session.status !== 'active') {
        throw new GeminiSessionException(
          options.sessionId,
          `Cannot stream audio: session is ${session.status}`
        );
      }

      if (session.abortController.signal.aborted) {
        throw new GeminiInterruptedException(options.sessionId);
      }

      session.lastActivityAt = new Date();
      session.messageCount++;

      const audioBase64 = this.arrayBufferToBase64(options.audioData);
      const audioLength = options.audioData.byteLength;

      const isFirstMessage = session.messageCount === 1;

      if (isFirstMessage && !session.isConnected) {
        const config = {
          systemInstruction: buildGroundedSystemInstruction({
            jobDescription: session.jobDescription,
            mode: 'mixed',
          }),
          responseModalities: [Modality.TEXT],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Puck',
              },
            },
          },
        };

        const responseQueue: LiveServerMessage[] = [];

        const sessionConnection = await this.ai.live.connect({
          model: session.model,
          callbacks: {
            onopen: () => {
              session.isConnected = true;
              this.logger.debug(`Live session connected: ${session.sessionId}`);
            },
            onmessage: (message: LiveServerMessage) => {
              responseQueue.push(message);
              if (session.resolveNextMessage) {
                const resolve = session.resolveNextMessage;
                session.resolveNextMessage = null;
                resolve(message);
              }
            },
            onerror: (error: any) => {
              this.logger.error(`Live session error: ${error.message}`);
            },
            onclose: (event: any) => {
              session.isConnected = false;
              this.logger.debug(`Live session closed: ${event.reason}`);
            },
          },
          config,
        });

        const initialPrompt = `I'm here to practice for a job interview. 

Job Description:
${session.jobDescription}

Please start by asking me the first interview question. Keep it focused and relevant to the position.`;

        await sessionConnection.sendClientContent({
          turns: initialPrompt,
          turnComplete: true,
        });

        let responseText = '';

        while (true) {
          if (session.abortController.signal.aborted) {
            throw new GeminiInterruptedException(options.sessionId);
          }

          let message: LiveServerMessage | undefined;

          if (responseQueue.length > 0) {
            message = responseQueue.shift();
          } else {
            await new Promise<LiveServerMessage>((resolve) => {
              session.resolveNextMessage = resolve;
              setTimeout(() => {
                if (session.resolveNextMessage) {
                  session.resolveNextMessage = null;
                }
              }, 5000);
            })
              .then((msg) => {
                message = msg;
              })
              .catch(() => {});

            if (!message && responseQueue.length > 0) {
              message = responseQueue.shift();
            }
          }

          if (!message) {
            break;
          }

          if (message.serverContent) {
            const parts = message.serverContent.modelTurn?.parts || [];
            for (const part of parts) {
              if (part.text) {
                responseText += part.text;

                yield {
                  text: responseText,
                  done: false,
                  metadata: {
                    sessionId: options.sessionId,
                    startTime,
                    endTime: Date.now(),
                    latency: Date.now() - startTime,
                    interrupted: false,
                  },
                };
              }
            }

            if (message.serverContent.turnComplete) {
              const latency = Date.now() - startTime;
              session.totalLatency += latency;

              yield {
                text: responseText,
                done: true,
                metadata: {
                  sessionId: options.sessionId,
                  startTime,
                  endTime: Date.now(),
                  latency,
                  interrupted: false,
                },
              };

              break;
            }
          }
        }
      } else {
        if (!session.isConnected) {
          throw new GeminiSessionException(options.sessionId, 'Live connection not established');
        }

        this.logger.debug(`Sending audio chunk ${session.messageCount} to Gemini Live API`);
      }

      this.logMetrics(options.sessionId, {
        action: 'stream_audio',
        latency: Date.now() - startTime,
        audioSize: audioLength,
        endOfUtterance: options.endOfUtterance,
      });
    } catch (error: any) {
      if (error.name === 'AbortError' || error instanceof GeminiInterruptedException) {
        session.status = 'interrupted';
        this.logger.warn(`Session ${options.sessionId} interrupted during streaming`);
        throw new GeminiInterruptedException(options.sessionId);
      }
      this.handleError(options.sessionId, 'streamAudio', error);
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async interruptSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new GeminiSessionException(sessionId, 'Session not found');
    }

    try {
      session.abortController.abort();
      session.status = 'interrupted';
      session.isConnected = false;

      this.logger.log(`Session ${sessionId} interrupted`);
      this.logMetrics(sessionId, { action: 'interrupt' });

      setTimeout(() => {
        if (session.status === 'interrupted') {
          this.closeSession(sessionId);
        }
      }, 30000);
    } catch (error: any) {
      this.handleError(sessionId, 'interruptSession', error);
    }
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.logger.warn(`Attempted to close non-existent session: ${sessionId}`);
      return;
    }

    try {
      session.abortController.abort();
      session.status = 'closed';
      session.isConnected = false;

      this.logMetrics(sessionId, {
        action: 'close_session',
        sessionDuration: Date.now() - session.createdAt.getTime(),
        messageCount: session.messageCount,
        totalTokens: session.totalTokens,
        averageLatency:
          session.messageCount > 0 ? Math.round(session.totalLatency / session.messageCount) : 0,
      });

      this.sessions.delete(sessionId);
      this.logger.log(`Session ${sessionId} closed`);
    } catch (error: any) {
      this.logger.error(`Error closing session ${sessionId}: ${error.message}`);
      this.sessions.delete(sessionId);
    }
  }

  getSession(sessionId: string): GeminiSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new GeminiSessionException(sessionId, 'Session not found');
    }
    return session as unknown as GeminiSession;
  }

  getActiveSessions(): GeminiSession[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.status === 'active'
    ) as unknown as GeminiSession[];
  }

  async cleanupInactiveSessions(maxAge: number = 3600000): Promise<void> {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      const age = now - session.lastActivityAt.getTime();
      if (age > maxAge) {
        toDelete.push(sessionId);
      }
    }

    for (const sessionId of toDelete) {
      await this.closeSession(sessionId);
    }

    if (toDelete.length > 0) {
      this.logger.log(`Cleaned up ${toDelete.length} inactive sessions`);
    }
  }

  async analyzeFrame(options: { sessionId: string; imageData: string; format?: string }): Promise<{
    eyeContact: number;
    posture: number;
    engagement: number;
    suggestions: string[];
    confidence: number;
  }> {
    const startTime = Date.now();

    try {
      this.logger.debug(`Analyzing frame for session ${options.sessionId}`);

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Analyze this video frame from a job interview practice session. The person should be looking at the camera, maintaining good posture, and appearing engaged.

Provide scores (0-100) for:
- eyeContact: How well they maintain eye contact with the camera
- posture: How good their sitting posture is (upright, not slouching)
- engagement: How engaged and attentive they appear

Also provide 2-3 specific, actionable suggestions to improve their interview presence.

Return a JSON object with these fields: eyeContact, posture, engagement, suggestions (array), confidence.`,
              },
              {
                inlineData: {
                  mimeType: options.format || 'image/jpeg',
                  data: options.imageData,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const text = response.text;
      this.logPrompt(options.sessionId, 'VISION_ANALYSIS', 'Frame analysis request');
      this.logResponse(options.sessionId, text, response);

      const analysis = this.parseAnalysisResponse(text);
      this.validateAnalysisSchema(analysis);

      const latency = Date.now() - startTime;

      this.logMetrics(options.sessionId, {
        action: 'analyze_frame',
        latency,
        imageSize: options.imageData.length,
        format: options.format,
      });

      return analysis;
    } catch (error: any) {
      this.handleError(options.sessionId, 'analyzeFrame', error);
    }
  }

  private parseAnalysisResponse(text: string): any {
    try {
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanedText);

      return {
        eyeContact: this.clampScore(parsed.eyeContact || 50),
        posture: this.clampScore(parsed.posture || 50),
        engagement: this.clampScore(parsed.engagement || 50),
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        confidence: this.clampScore(parsed.confidence || 50),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to parse analysis response: ${errorMessage}`);
      return {
        eyeContact: 50,
        posture: 50,
        engagement: 50,
        suggestions: [],
        confidence: 50,
      };
    }
  }

  private validateAnalysisSchema(analysis: any): void {
    const errors: string[] = [];

    if (
      typeof analysis.eyeContact !== 'number' ||
      analysis.eyeContact < 0 ||
      analysis.eyeContact > 100
    ) {
      errors.push('eyeContact must be a number between 0 and 100');
    }
    if (typeof analysis.posture !== 'number' || analysis.posture < 0 || analysis.posture > 100) {
      errors.push('posture must be a number between 0 and 100');
    }
    if (
      typeof analysis.engagement !== 'number' ||
      analysis.engagement < 0 ||
      analysis.engagement > 100
    ) {
      errors.push('engagement must be a number between 0 and 100');
    }
    if (!Array.isArray(analysis.suggestions)) {
      errors.push('suggestions must be an array');
    }
    if (
      typeof analysis.confidence !== 'number' ||
      analysis.confidence < 0 ||
      analysis.confidence > 100
    ) {
      errors.push('confidence must be a number between 0 and 100');
    }

    if (errors.length > 0) {
      throw new GeminiException(`Invalid analysis schema: ${errors.join(', ')}`, 400);
    }
  }

  private clampScore(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  onModuleDestroy(): void {
    this.logger.log('Cleaning up all Gemini sessions...');
    for (const sessionId of this.sessions.keys()) {
      this.closeSession(sessionId);
    }
  }

  private handleError(sessionId: string, operation: string, error: any): never {
    this.winstonLogger.error({
      message: `Gemini error in ${operation}`,
      sessionId,
      operation,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    if (error.status === 401 || error.status === 403) {
      throw new GeminiApiKeyException(error.message);
    }

    if (error.status === 429) {
      throw new GeminiQuotaException(error.message);
    }

    if (error.message?.includes('safety') || error.message?.includes('blocked')) {
      throw new GeminiSafetyException(error.message);
    }

    if (error.name === 'AbortError') {
      throw new GeminiInterruptedException(sessionId);
    }

    throw new GeminiException(`Gemini ${operation} failed: ${error.message}`, error.status || 500);
  }

  private logPrompt(sessionId: string, type: string, content: string): void {
    if (!this.enableLogging) {
      return;
    }

    const maxLength = 500;
    const truncated =
      content.length > maxLength ? content.substring(0, maxLength) + '...' : content;

    this.winstonLogger.debug({
      message: 'Gemini prompt',
      sessionId,
      type,
      prompt: truncated,
      promptLength: content.length,
      timestamp: new Date().toISOString(),
    });
  }

  private logResponse(sessionId: string, content: string, fullResponse: any): void {
    if (!this.enableLogging) {
      return;
    }

    const maxLength = 500;
    const truncated =
      content.length > maxLength ? content.substring(0, maxLength) + '...' : content;

    this.winstonLogger.debug({
      message: 'Gemini response',
      sessionId,
      response: truncated,
      responseLength: content.length,
      usageMetadata: fullResponse.usageMetadata,
      timestamp: new Date().toISOString(),
    });
  }

  private logMetrics(sessionId: string, metrics: Record<string, unknown>): void {
    if (!this.enableMetrics) {
      return;
    }

    this.winstonLogger.log({
      message: 'Gemini metrics',
      sessionId,
      ...metrics,
      timestamp: new Date().toISOString(),
    });
  }
}
