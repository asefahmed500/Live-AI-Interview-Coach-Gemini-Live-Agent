import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { GeminiService } from './gemini.service';
import { GeminiApiKeyException, GeminiException, GeminiQuotaException } from './exceptions';
import { GoogleGenAI } from '@google/genai';

describe('GeminiService', () => {
  let service: GeminiService;
  let configService: ConfigService;
  let winstonLogger: any;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockWinstonLogger = {
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: mockWinstonLogger,
        },
      ],
    }).compile();

    service = module.get<GeminiService>(GeminiService);
    configService = module.get<ConfigService>(ConfigService);
    winstonLogger = module.get(WINSTON_MODULE_NEST_PROVIDER);

    // Mock valid API key
    mockConfigService.get.mockImplementation((key: string) => {
      const config: Record<string, any> = {
        GEMINI_API_KEY: 'test_api_key_valid_and_long_enough_for_validation',
        GEMINI_ENABLE_LOGGING: true,
        GEMINI_ENABLE_METRICS: true,
        GEMINI_TIMEOUT: 60000,
      };
      return config[key];
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Module Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should throw GeminiApiKeyException when API key is missing', () => {
      mockConfigService.get.mockReturnValueOnce(undefined);

      expect(() => new GeminiService(configService, winstonLogger)).toThrow(GeminiApiKeyException);
    });

    it('should throw GeminiApiKeyException when API key is invalid', () => {
      mockConfigService.get.mockReturnValueOnce('invalid');

      expect(() => new GeminiService(configService, winstonLogger)).toThrow(GeminiApiKeyException);
    });

    it('should initialize with valid API key', () => {
      mockConfigService.get.mockReturnValueOnce('valid_api_key_with_sufficient_length_12345');

      expect(() => new GeminiService(configService, winstonLogger)).not.toThrow();
    });
  });

  describe('createSession', () => {
    const validJobDescription = `
      We are looking for a Senior Software Engineer with experience in:
      - 5+ years of software development experience
      - Proficiency in TypeScript and Node.js
      - Experience with cloud platforms (AWS/GCP)
      - Strong problem-solving skills
    `;

    it('should create a session successfully', async () => {
      const result = await service.createSession({
        jobDescription: validJobDescription,
        mode: 'technical',
        difficulty: 'senior',
      });

      expect(result).toBeDefined();
      expect(result.sessionId).toMatch(/^gemini_/);
      expect(result.status).toBe('active');
      expect(result.jobDescription).toBe(validJobDescription);
    });

    it('should create session with default mode when not specified', async () => {
      const result = await service.createSession({
        jobDescription: validJobDescription,
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('active');
    });

    it('should log prompts when logging is enabled', async () => {
      mockConfigService.get.mockReturnValueOnce('valid_api_key_with_sufficient_length_12345');

      await service.createSession({
        jobDescription: validJobDescription,
        mode: 'technical',
      });

      expect(winstonLogger.debug).toHaveBeenCalled();
    });

    it('should log metrics when metrics are enabled', async () => {
      mockConfigService.get.mockReturnValueOnce('valid_api_key_with_sufficient_length_12345');

      await service.createSession({
        jobDescription: validJobDescription,
        mode: 'technical',
      });

      expect(winstonLogger.log).toHaveBeenCalled();
    });

    it('should create different session IDs for each session', async () => {
      const session1 = await service.createSession({
        jobDescription: validJobDescription,
      });

      const session2 = await service.createSession({
        jobDescription: validJobDescription,
      });

      expect(session1.sessionId).not.toBe(session2.sessionId);
    });

    it('should handle empty job description with warning', async () => {
      const result = await service.createSession({
        jobDescription: '   ', // Whitespace only
        mode: 'technical',
      });

      expect(result).toBeDefined();
      expect(winstonLogger.warn).toHaveBeenCalled();
    });
  });

  describe('getSession', () => {
    it('should return existing session', async () => {
      const created = await service.createSession({
        jobDescription: 'Test job description',
      });

      const retrieved = service.getSession(created.sessionId);

      expect(retrieved).toBeDefined();
      expect(retrieved.sessionId).toBe(created.sessionId);
    });

    it('should throw GeminiException for non-existent session', () => {
      expect(() => service.getSession('non_existent_session')).toThrow(GeminiException);
    });
  });

  describe('getActiveSessions', () => {
    it('should return empty array when no sessions exist', () => {
      const active = service.getActiveSessions();
      expect(active).toEqual([]);
    });

    it('should return only active sessions', async () => {
      const session1 = await service.createSession({
        jobDescription: 'Test job 1',
      });

      const session2 = await service.createSession({
        jobDescription: 'Test job 2',
      });

      await service.closeSession(session1.sessionId);

      const active = service.getActiveSessions();

      expect(active.length).toBe(1);
      expect(active[0].sessionId).toBe(session2.sessionId);
    });
  });

  describe('closeSession', () => {
    it('should close active session', async () => {
      const session = await service.createSession({
        jobDescription: 'Test job',
      });

      await service.closeSession(session.sessionId);

      expect(() => service.getSession(session.sessionId)).toThrow(GeminiException);
    });

    it('should handle closing non-existent session gracefully', async () => {
      await expect(service.closeSession('non_existent')).resolves.not.toThrow();
    });

    it('should log session summary on close', async () => {
      const session = await service.createSession({
        jobDescription: 'Test job',
      });

      await service.closeSession(session.sessionId);

      expect(winstonLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Gemini metrics'),
          action: 'close_session',
        })
      );
    });
  });

  describe('interruptSession', () => {
    it('should interrupt active session', async () => {
      const session = await service.createSession({
        jobDescription: 'Test job',
      });

      await service.interruptSession(session.sessionId);

      const retrieved = service.getSession(session.sessionId);
      expect(retrieved.status).toBe('interrupted');
    });

    it('should log interrupt metrics', async () => {
      const session = await service.createSession({
        jobDescription: 'Test job',
      });

      await service.interruptSession(session.sessionId);

      expect(winstonLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'interrupt',
        })
      );
    });
  });

  describe('streamAudio', () => {
    it('should yield response chunks', async () => {
      const session = await service.createSession({
        jobDescription: 'Test job',
      });

      const chunks = [];
      const audioData = new ArrayBuffer(1024);

      for await (const chunk of service.streamAudio({
        sessionId: session.sessionId,
        audioData: audioData,
        mimeType: 'audio/webm',
      })) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]).toHaveProperty('text');
      expect(chunks[0]).toHaveProperty('done');
      expect(chunks[0]).toHaveProperty('metadata');
    });

    it('should throw for inactive session', async () => {
      const session = await service.createSession({
        jobDescription: 'Test job',
      });

      await service.closeSession(session.sessionId);

      const stream = service.streamAudio({
        sessionId: session.sessionId,
        audioData: new ArrayBuffer(1024),
      });

      await expect(stream.next()).rejects.toThrow();
    });

    it('should handle interrupted session', async () => {
      const session = await service.createSession({
        jobDescription: 'Test job',
      });

      await service.interruptSession(session.sessionId);

      const stream = service.streamAudio({
        sessionId: session.sessionId,
        audioData: new ArrayBuffer(1024),
      });

      await expect(stream.next()).rejects.toThrow();
    });
  });

  describe('analyzeFrame', () => {
    const validImageData = 'base64_encoded_image_data_here';

    it('should analyze frame and return structured data', async () => {
      const session = await service.createSession({
        jobDescription: 'Test job',
      });

      // Mock the response since we can't actually call Gemini in tests
      jest.spyOn(service as any, 'genAI').mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: jest.fn().mockResolvedValue({
            response: {
              text: () =>
                JSON.stringify({
                  eyeContact: 75,
                  posture: 80,
                  engagement: 70,
                  suggestions: ['Maintain better eye contact', 'Sit up straighter'],
                  confidence: 75,
                }),
            },
          }),
        }),
      }));

      const result = await service.analyzeFrame({
        sessionId: session.sessionId,
        imageData: validImageData,
        format: 'image/jpeg',
      });

      expect(result).toHaveProperty('eyeContact');
      expect(result).toHaveProperty('posture');
      expect(result).toHaveProperty('engagement');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('confidence');

      expect(result.eyeContact).toBeGreaterThanOrEqual(0);
      expect(result.eyeContact).toBeLessThanOrEqual(100);
      expect(result.posture).toBeGreaterThanOrEqual(0);
      expect(result.posture).toBeLessThanOrEqual(100);
    });

    it('should handle parsing errors gracefully', async () => {
      const session = await service.createSession({
        jobDescription: 'Test job',
      });

      jest.spyOn(service as any, 'genAI').mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: jest.fn().mockResolvedValue({
            response: {
              text: () => 'invalid json {{{',
            },
          }),
        }),
      }));

      const result = await service.analyzeFrame({
        sessionId: session.sessionId,
        imageData: validImageData,
      });

      // Should return default values on parse error
      expect(result.eyeContact).toBe(50);
      expect(result.posture).toBe(50);
      expect(result.engagement).toBe(50);
    });

    it('should clamp scores to 0-100 range', async () => {
      const session = await service.createSession({
        jobDescription: 'Test job',
      });

      jest.spyOn(service as any, 'genAI').mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: jest.fn().mockResolvedValue({
            response: {
              text: () =>
                JSON.stringify({
                  eyeContact: 150, // Over 100
                  posture: -20, // Under 0
                  engagement: 75,
                  suggestions: [],
                  confidence: 200,
                }),
            },
          }),
        }),
      }));

      const result = await service.analyzeFrame({
        sessionId: session.sessionId,
        imageData: validImageData,
      });

      expect(result.eyeContact).toBe(100);
      expect(result.posture).toBe(0);
      expect(result.confidence).toBe(100);
    });
  });

  describe('cleanupInactiveSessions', () => {
    it('should remove sessions older than maxAge', async () => {
      const session1 = await service.createSession({
        jobDescription: 'Test job 1',
      });

      const session2 = await service.createSession({
        jobDescription: 'Test job 2',
      });

      // Manually set lastActivityAt to be old
      (session1 as any).lastActivityAt = new Date(Date.now() - 4000000); // > 1 hour

      await service.cleanupInactiveSessions(3600000); // 1 hour

      expect(() => service.getSession(session1.sessionId)).toThrow();
      expect(service.getSession(session2.sessionId)).toBeDefined();
    });

    it('should not remove active sessions', async () => {
      const session = await service.createSession({
        jobDescription: 'Test job',
      });

      await service.cleanupInactiveSessions(1000); // 1 second

      expect(service.getSession(session.sessionId)).toBeDefined();
    });
  });

  describe('onModuleDestroy', () => {
    it('should clean up all sessions on module destroy', async () => {
      await service.createSession({ jobDescription: 'Job 1' });
      await service.createSession({ jobDescription: 'Job 2' });

      service.onModuleDestroy();

      expect(service.getActiveSessions()).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors appropriately', async () => {
      const session = await service.createSession({
        jobDescription: 'Test job',
      });

      // Mock API error
      jest.spyOn(service as any, 'genAI').mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: jest.fn().mockRejectedValue({
            status: 500,
            message: 'Internal server error',
          }),
        }),
      }));

      await expect(
        service.analyzeFrame({
          sessionId: session.sessionId,
          imageData: 'test_data',
        })
      ).rejects.toThrow();
    });

    it('should handle quota exceeded errors', async () => {
      const session = await service.createSession({
        jobDescription: 'Test job',
      });

      jest.spyOn(service as any, 'genAI').mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: jest.fn().mockRejectedValue({
            status: 429,
            message: 'Quota exceeded',
          }),
        }),
      }));

      await expect(
        service.analyzeFrame({
          sessionId: session.sessionId,
          imageData: 'test_data',
        })
      ).rejects.toThrow(GeminiQuotaException);
    });
  });

  describe('Logging', () => {
    it('should log prompts when enabled', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, any> = {
          GEMINI_API_KEY: 'valid_key_with_sufficient_length_12345',
          GEMINI_ENABLE_LOGGING: true,
        };
        return config[key];
      });

      const newService = new GeminiService(configService, winstonLogger);

      await newService.createSession({
        jobDescription: 'Test job description',
      });

      expect(winstonLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Gemini prompt',
        })
      );
    });

    it('should not log prompts when disabled', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, any> = {
          GEMINI_API_KEY: 'valid_key_with_sufficient_length_12345',
          GEMINI_ENABLE_LOGGING: false,
        };
        return config[key];
      });

      const newService = new GeminiService(configService, winstonLogger);

      await newService.createSession({
        jobDescription: 'Test job description',
      });

      expect(winstonLogger.debug).not.toHaveBeenCalled();
    });
  });
});
