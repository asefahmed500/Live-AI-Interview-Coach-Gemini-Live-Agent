import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, Socket } from 'socket.io';
import { createServer } from 'http';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { WinstonModule } from 'nest-winston';
import { ConfigModule } from '@nestjs/config';
import { LiveInterviewGateway } from './websocket.gateway';
import { SessionManagerService } from './services/session-manager.service';
import { GeminiModule } from '../gemini';
import { ConfidenceEngineService } from '../confidence/confidence-engine.service';

describe('LiveInterviewGateway (Integration)', () => {
  let app: INestApplication;
  let server: Server;
  let gateway: LiveInterviewGateway;
  let clientSocket: ClientSocket;
  let sessionManager: SessionManagerService;
  let confidenceEngine: ConfidenceEngineService;

  const PORT = 5100;
  const WS_URL = `http://localhost:${PORT}`;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        WinstonModule.forRoot({
          transports: [],
        }),
        GeminiModule,
      ],
      providers: [
        LiveInterviewGateway,
        SessionManagerService,
        ConfidenceEngineService,
      ],
    }).compile();

    app = module.createNestApplication();
    app.useWebSocketAdapter(new IoAdapter(app));

    gateway = module.get<LiveInterviewGateway>(LiveInterviewGateway);
    sessionManager = module.get<SessionManagerService>(SessionManagerService);
    confidenceEngine = module.get<ConfidenceEngineService>(ConfidenceEngineService);

    // Create HTTP server for Socket.IO
    const httpServer = createServer();
    httpServer.listen(PORT);

    await app.init();
  });

  afterAll(async () => {
    if (clientSocket) {
      clientSocket.close();
    }
    await app.close();
  });

  beforeEach((done) => {
    // Create client socket for each test
    clientSocket = ioClient(WS_URL, {
      transports: ['websocket'],
      reconnection: false,
    });

    clientSocket.on('connect', done);
    clientSocket.on('connect_error', (err) => {
      done(err);
    });
  });

  afterEach(() => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Connection Handling', () => {
    it('should establish connection', (done) => {
      clientSocket.on('connection_established', (data) => {
        expect(data).toHaveProperty('clientId');
        expect(data).toHaveProperty('message');
        expect(data.message).toContain('Connected');
        done();
      });
    });

    it('should handle multiple concurrent connections', (done) => {
      const client2 = ioClient(WS_URL, {
        transports: ['websocket'],
        reconnection: false,
      });

      let connections = 0;

      const handler = (_data: any) => {
        connections++;
        if (connections === 2) {
          client2.close();
          done();
        }
      };

      clientSocket.on('connection_established', handler);
      client2.on('connection_established', handler);
    });

    it('should handle disconnection gracefully', (done) => {
      clientSocket.on('connection_established', () => {
        clientSocket.disconnect();
      });

      clientSocket.on('disconnect', (reason) => {
        expect(reason).toBeDefined();
        done();
      });
    });
  });

  describe('Session Lifecycle', () => {
    const jobDescription = `
      Senior Software Engineer position.
      Requirements: 5+ years experience, TypeScript, Node.js, AWS.
    `;

    it('should start a new session', (done) => {
      clientSocket.emit('start_session', {
        jobDescription,
        mode: 'technical',
        difficulty: 'senior',
      });

      clientSocket.on('session_started', (data) => {
        expect(data).toHaveProperty('sessionId');
        expect(data).toHaveProperty('mode');
        expect(data.mode).toBe('technical');
        expect(data).toHaveProperty('difficulty');
        expect(data.difficulty).toBe('senior');
        done();
      });

      clientSocket.on('error', (err) => {
        done(err);
      });
    });

    it('should reject session start without job description', (done) => {
      clientSocket.emit('start_session', {
        mode: 'technical',
      });

      clientSocket.on('error', (data) => {
        expect(data).toHaveProperty('message');
        expect(data).toHaveProperty('code');
        done();
      });
    });

    it('should stop an active session', (done) => {
      let sessionId: string;

      clientSocket.emit('start_session', {
        jobDescription,
      });

      clientSocket.on('session_started', (data) => {
        sessionId = data.sessionId;

        clientSocket.emit('stop_session', {
          sessionId,
          reason: 'user_completed',
        });
      });

      clientSocket.on('session_ended', (data) => {
        expect(data.sessionId).toBe(sessionId);
        expect(data.reason).toBe('user_completed');
        done();
      });
    });

    it('should handle session interrupt', (done) => {
      let sessionId: string;

      clientSocket.emit('start_session', {
        jobDescription,
      });

      clientSocket.on('session_started', (data) => {
        sessionId = data.sessionId;

        clientSocket.emit('interrupt', {
          sessionId,
          reason: 'user_stopped',
        });
      });

      clientSocket.on('interrupt_acknowledged', (data) => {
        expect(data.sessionId).toBe(sessionId);
        done();
      });
    });
  });

  describe('Audio Streaming', () => {
    const jobDescription = 'Test job description for audio streaming';
    let sessionId: string;

    beforeEach((done) => {
      clientSocket.emit('start_session', {
        jobDescription,
      });

      clientSocket.on('session_started', (data) => {
        sessionId = data.sessionId;
        done();
      });
    });

    it('should accept audio chunks', (done) => {
      const audioChunk = Buffer.alloc(1024, 'test audio data').toString('base64');

      clientSocket.emit('audio_chunk', {
        sessionId,
        chunkData: audioChunk,
        sequenceNumber: 1,
        timestamp: Date.now(),
      });

      clientSocket.on('audio_received', (data) => {
        expect(data.sessionId).toBe(sessionId);
        expect(data.sequenceNumber).toBe(1);
        done();
      });

      clientSocket.on('error', done);
    });

    it('should reject audio without sessionId', (done) => {
      const audioChunk = Buffer.alloc(1024).toString('base64');

      clientSocket.emit('audio_chunk', {
        chunkData: audioChunk,
        sequenceNumber: 1,
      });

      clientSocket.on('error', (data) => {
        expect(data.code).toBe('MISSING_SESSION_ID');
        done();
      });
    });

    it('should reject audio for non-existent session', (done) => {
      const audioChunk = Buffer.alloc(1024).toString('base64');

      clientSocket.emit('audio_chunk', {
        sessionId: 'non_existent_session',
        chunkData: audioChunk,
        sequenceNumber: 1,
      });

      clientSocket.on('error', (data) => {
        expect(data.code).toBe('SESSION_NOT_FOUND');
        done();
      });
    });

    it('should handle multiple audio chunks in sequence', (done) => {
      let receivedCount = 0;
      const totalChunks = 5;

      clientSocket.on('audio_received', () => {
        receivedCount++;
        if (receivedCount === totalChunks) {
          done();
        }
      });

      for (let i = 0; i < totalChunks; i++) {
        const audioChunk = Buffer.alloc(1024).toString('base64');

        clientSocket.emit('audio_chunk', {
          sessionId,
          chunkData: audioChunk,
          sequenceNumber: i,
          timestamp: Date.now(),
        });
      }
    });
  });

  describe('Frame Analysis', () => {
    const jobDescription = 'Test job for frame analysis';
    let sessionId: string;

    beforeEach((done) => {
      clientSocket.emit('start_session', {
        jobDescription,
      });

      clientSocket.on('session_started', (data) => {
        sessionId = data.sessionId;
        done();
      });
    });

    it('should accept frame analysis requests', (done) => {
      const frameData = 'base64_encoded_frame_data_here';

      clientSocket.emit('frame_analysis', {
        sessionId,
        frameData,
        frameNumber: 1,
        timestamp: Date.now(),
        format: 'image/jpeg',
      });

      clientSocket.on('frame_processed', (data) => {
        expect(data.sessionId).toBe(sessionId);
        expect(data.frameNumber).toBe(1);
        expect(data).toHaveProperty('confidence');
        done();
      });

      clientSocket.on('error', done);
    });

    it('should emit confidence update on frame analysis', (done) => {
      const frameData = 'base64_encoded_frame_data';

      clientSocket.emit('frame_analysis', {
        sessionId,
        frameData,
        frameNumber: 1,
        timestamp: Date.now(),
      });

      clientSocket.on('confidence_update', (data) => {
        expect(data.sessionId).toBe(sessionId);
        expect(data).toHaveProperty('confidence');
        expect(data).toHaveProperty('breakdown');
        done();
      });

      clientSocket.on('error', done);
    });

    it('should reject frame without sessionId', (done) => {
      clientSocket.emit('frame_analysis', {
        frameData: 'data',
        frameNumber: 1,
        timestamp: Date.now(),
      });

      clientSocket.on('error', (data) => {
        expect(data.code).toBe('MISSING_SESSION_ID');
        done();
      });
    });

    it('should handle invalid frame data gracefully', (done) => {
      clientSocket.emit('frame_analysis', {
        sessionId,
        frameData: 'invalid_base64_data!@#$',
        frameNumber: 1,
        timestamp: Date.now(),
      });

      // Should either succeed with default values or return an error
      let handled = false;

      clientSocket.on('frame_processed', () => {
        handled = true;
        done();
      });

      clientSocket.on('error', () => {
        handled = true;
        done();
      });

      setTimeout(() => {
        if (!handled) {
          done(new Error('No response received'));
        }
      }, 5000);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON in messages', (done) => {
      // Socket.IO handles JSON parsing, so we test protocol errors
      clientSocket.emit('invalid_event', {});

      clientSocket.on('error', (data) => {
        expect(data).toHaveProperty('message');
        done();
      });

      setTimeout(done, 1000);
    });

    it('should handle malformed sessionId', (done) => {
      clientSocket.emit('audio_chunk', {
        sessionId: null,
        chunkData: 'data',
        sequenceNumber: 1,
      });

      clientSocket.on('error', (data) => {
        expect(data).toHaveProperty('message');
        done();
      });
    });

    it('should handle operation on closed session', (done) => {
      let sessionId: string;

      clientSocket.emit('start_session', {
        jobDescription: 'Test job',
      });

      clientSocket.on('session_started', (data) => {
        sessionId = data.sessionId;

        clientSocket.emit('stop_session', {
          sessionId,
          reason: 'test',
        });

        // Try to send audio after closing
        setTimeout(() => {
          clientSocket.emit('audio_chunk', {
            sessionId,
            chunkData: Buffer.alloc(100).toString('base64'),
            sequenceNumber: 1,
          });
        }, 100);
      });

      clientSocket.on('error', (data) => {
        expect(data.code).toBe('SESSION_NOT_FOUND');
        done();
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limits on audio chunks', (done) => {
      let sessionId: string;
      let errorReceived = false;
      let audioReceived = 0;

      clientSocket.emit('start_session', {
        jobDescription: 'Test job',
      });

      clientSocket.on('session_started', (data) => {
        sessionId = data.sessionId;

        // Send many chunks quickly to trigger rate limit
        for (let i = 0; i < 150; i++) {
          clientSocket.emit('audio_chunk', {
            sessionId,
            chunkData: Buffer.alloc(100).toString('base64'),
            sequenceNumber: i,
            timestamp: Date.now(),
          });
        }
      });

      clientSocket.on('audio_received', () => {
        audioReceived++;
      });

      clientSocket.on('error', (data) => {
        if (data.code === 'TOO_MANY_REQUESTS') {
          errorReceived = true;
        }
      });

      setTimeout(() => {
        // Should have received some rate limiting
        expect(audioReceived).toBeGreaterThan(0);
        expect(errorReceived).toBe(true);
        done();
      }, 2000);
    });
  });

  describe('Room Management', () => {
    it('should join session room after starting session', (done) => {
      clientSocket.emit('start_session', {
        jobDescription: 'Test job',
      });

      clientSocket.on('session_started', (data) => {
        const roomId = `session:${data.sessionId}`;

        // Client should have joined the room
        expect((clientSocket as any).rooms).toContain(roomId);
        done();
      });
    });

    it('should leave session room after stopping session', (done) => {
      let sessionId: string;
      let roomId: string;

      clientSocket.emit('start_session', {
        jobDescription: 'Test job',
      });

      clientSocket.on('session_started', (data) => {
        sessionId = data.sessionId;
        roomId = `session:${data.sessionId}`;

        clientSocket.emit('stop_session', {
          sessionId,
          reason: 'test',
        });
      });

      clientSocket.on('session_ended', () => {
        // Client should have left the room
        expect((clientSocket as any).rooms).not.toContain(roomId);
        done();
      });
    });
  });

  describe('Confidence Engine Integration', () => {
    it('should register session with confidence engine on start', (done) => {
      clientSocket.emit('start_session', {
        jobDescription: 'Test job',
      });

      clientSocket.on('session_started', (data) => {
        // Session should be registered with confidence engine
        const session = sessionManager.getSession(data.sessionId);
        expect(session).toBeDefined();
        done();
      });
    });

    it('should unregister session from confidence engine on stop', (done) => {
      let sessionId: string;

      clientSocket.emit('start_session', {
        jobDescription: 'Test job',
      });

      clientSocket.on('session_started', (data) => {
        sessionId = data.sessionId;

        clientSocket.emit('stop_session', {
          sessionId,
          reason: 'test',
        });
      });

      clientSocket.on('session_ended', () => {
        // Session should be cleaned up
        expect(() => sessionManager.getSession(sessionId)).toThrow();
        done();
      });
    });
  });

  describe('Transcript Tracking', () => {
    it('should maintain transcript during session', (done) => {
      let sessionId: string;

      clientSocket.emit('start_session', {
        jobDescription: 'Test job',
      });

      clientSocket.on('session_started', (data) => {
        sessionId = data.sessionId;

        // Send an audio chunk
        clientSocket.emit('audio_chunk', {
          sessionId,
          chunkData: Buffer.alloc(100).toString('base64'),
          sequenceNumber: 1,
        });
      });

      clientSocket.on('ai_response', () => {
        const transcript = sessionManager.getTranscript(sessionId);
        expect(transcript.length).toBeGreaterThan(0);
        done();
      });
    });
  });

  describe('WebSocket Events', () => {
    it('should emit transcript_partial events', (done) => {
      let sessionId: string;

      clientSocket.emit('start_session', {
        jobDescription: 'Test job',
      });

      clientSocket.on('session_started', (data) => {
        sessionId = data.sessionId;

        clientSocket.emit('audio_chunk', {
          sessionId,
          chunkData: Buffer.alloc(100).toString('base64'),
          sequenceNumber: 1,
        });
      });

      clientSocket.on('transcript_partial', (data) => {
        expect(data.sessionId).toBe(sessionId);
        expect(data).toHaveProperty('text');
        done();
      });
    });

    it('should emit ai_response events', (done) => {
      clientSocket.emit('start_session', {
        jobDescription: 'Test job',
      });

      clientSocket.on('ai_response', (data) => {
        expect(data).toHaveProperty('sessionId');
        expect(data).toHaveProperty('role');
        expect(data).toHaveProperty('content');
        done();
      });
    });
  });

  describe('Security', () => {
    it('should sanitize error messages', (done) => {
      clientSocket.emit('start_session', {
        jobDescription: 'Test job',
      });

      clientSocket.on('session_started', (data) => {
        // Try to inject malicious data
        clientSocket.emit('audio_chunk', {
          sessionId: data.sessionId + "'; DROP TABLE sessions; --",
          chunkData: Buffer.alloc(100).toString('base64'),
          sequenceNumber: 1,
        });
      });

      clientSocket.on('error', (error) => {
        // Should not leak internal error details
        expect(error.message).not.toContain('DROP TABLE');
        expect(error.message).not.toContain('sequelize');
        done();
      });
    });

    it('should validate sessionId format', (done) => {
      const audioChunk = Buffer.alloc(100).toString('base64');

      clientSocket.emit('audio_chunk', {
        sessionId: '../../../etc/passwd',
        chunkData: audioChunk,
        sequenceNumber: 1,
      });

      clientSocket.on('error', (data) => {
        expect(data).toHaveProperty('message');
        done();
      });
    });
  });

  describe('Memory Management', () => {
    it('should limit frame analysis history', (done) => {
      let sessionId: string;

      clientSocket.emit('start_session', {
        jobDescription: 'Test job',
      });

      clientSocket.on('session_started', (data) => {
        sessionId = data.sessionId;

        // Send more than 100 frames
        for (let i = 0; i < 105; i++) {
          clientSocket.emit('frame_analysis', {
            sessionId,
            frameData: `frame_${i}`,
            frameNumber: i,
            timestamp: Date.now(),
          });
        }

        setTimeout(() => {
          const analyses = sessionManager.getFrameAnalyses(sessionId);
          expect(analyses.length).toBeLessThanOrEqual(100);
          done();
        }, 2000);
      });
    });

    it('should limit audio buffer size', (done) => {
      let sessionId: string;

      clientSocket.emit('start_session', {
        jobDescription: 'Test job',
      });

      clientSocket.on('session_started', (data) => {
        sessionId = data.sessionId;

        // Add audio chunks
        for (let i = 0; i < 105; i++) {
          sessionManager.addAudioToBuffer(
            sessionId,
            i,
            new ArrayBuffer(1024),
            Date.now()
          );
        }

        const buffer = sessionManager.getAudioBuffer(sessionId);
        // Buffer should be limited (max 100)
        expect(buffer.length).toBeLessThanOrEqual(100);
        done();
      });
    });
  });
});
