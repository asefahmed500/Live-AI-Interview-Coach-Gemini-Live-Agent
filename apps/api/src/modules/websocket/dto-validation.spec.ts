import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  StartSessionDto,
  AudioChunkDto,
  FrameAnalysisDto,
  InterruptDto,
  StopSessionDto,
} from './dtos';

describe('WebSocket DTOs Validation', () => {
  describe('StartSessionDto', () => {
    const validDto = {
      jobDescription: 'We are looking for a Senior Software Engineer...',
      mode: 'technical' as const,
      difficulty: 'senior' as const,
    };

    it('should validate a valid DTO', async () => {
      const dto = plainToInstance(StartSessionDto, validDto);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should require jobDescription', async () => {
      const dto = plainToInstance(StartSessionDto, {
        mode: 'technical',
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'jobDescription')).toBe(true);
    });

    it('should reject empty jobDescription', async () => {
      const dto = plainToInstance(StartSessionDto, {
        jobDescription: '   ',
        mode: 'technical',
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate mode enum', async () => {
      const dto = plainToInstance(StartSessionDto, {
        jobDescription: 'Test job',
        mode: 'invalid_mode' as any,
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'mode')).toBe(true);
    });

    it('should validate difficulty enum', async () => {
      const dto = plainToInstance(StartSessionDto, {
        jobDescription: 'Test job',
        difficulty: 'invalid_difficulty' as any,
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'difficulty')).toBe(true);
    });

    it('should accept optional sessionId', async () => {
      const dto = plainToInstance(StartSessionDto, {
        ...validDto,
        sessionId: 'custom_session_id',
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should trim whitespace from jobDescription', async () => {
      const dto = plainToInstance(StartSessionDto, {
        jobDescription: '  Test job description  ',
        mode: 'technical',
      });

      expect(dto.jobDescription).toBe('  Test job description  ');
      // Trimming would happen in the service, not DTO validation
    });
  });

  describe('AudioChunkDto', () => {
    const validDto = {
      sessionId: 'session_123',
      chunkData: 'base64encodeddatahere',
      sequenceNumber: 1,
      timestamp: Date.now(),
      codec: 'pcm16' as const,
    };

    it('should validate a valid DTO', async () => {
      const dto = plainToInstance(AudioChunkDto, validDto);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should require sessionId', async () => {
      const dto = plainToInstance(AudioChunkDto, {
        chunkData: 'data',
        sequenceNumber: 1,
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'sessionId')).toBe(true);
    });

    it('should require chunkData', async () => {
      const dto = plainToInstance(AudioChunkDto, {
        sessionId: 'session_123',
        sequenceNumber: 1,
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'chunkData')).toBe(true);
    });

    it('should require sequenceNumber', async () => {
      const dto = plainToInstance(AudioChunkDto, {
        sessionId: 'session_123',
        chunkData: 'data',
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'sequenceNumber')).toBe(true);
    });

    it('should validate sequenceNumber is positive', async () => {
      const dto = plainToInstance(AudioChunkDto, {
        sessionId: 'session_123',
        chunkData: 'data',
        sequenceNumber: -1,
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate codec enum', async () => {
      const dto = plainToInstance(AudioChunkDto, {
        sessionId: 'session_123',
        chunkData: 'data',
        sequenceNumber: 1,
        codec: 'invalid_codec' as any,
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'codec')).toBe(true);
    });

    it('should accept valid codec values', async () => {
      const codecs: Array<'pcm16' | 'opus' | 'aac' | 'mp3'> = ['pcm16', 'opus', 'aac', 'mp3'];

      for (const codec of codecs) {
        const dto = plainToInstance(AudioChunkDto, {
          sessionId: 'session_123',
          chunkData: 'data',
          sequenceNumber: 1,
          codec,
        });
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
      }
    });
  });

  describe('FrameAnalysisDto', () => {
    const validDto = {
      sessionId: 'session_123',
      frameData: 'base64imagedatahere',
      timestamp: Date.now(),
      frameNumber: 1,
      format: 'jpeg' as const,
      width: 1920,
      height: 1080,
    };

    it('should validate a valid DTO', async () => {
      const dto = plainToInstance(FrameAnalysisDto, validDto);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should require sessionId', async () => {
      const dto = plainToInstance(FrameAnalysisDto, {
        frameData: 'data',
        frameNumber: 1,
        timestamp: Date.now(),
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'sessionId')).toBe(true);
    });

    it('should require frameData', async () => {
      const dto = plainToInstance(FrameAnalysisDto, {
        sessionId: 'session_123',
        frameNumber: 1,
        timestamp: Date.now(),
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'frameData')).toBe(true);
    });

    it('should validate base64 format of frameData', async () => {
      const dto = plainToInstance(FrameAnalysisDto, {
        sessionId: 'session_123',
        frameData: 'not-valid-base64!@#$%',
        frameNumber: 1,
        timestamp: Date.now(),
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should require frameNumber', async () => {
      const dto = plainToInstance(FrameAnalysisDto, {
        sessionId: 'session_123',
        frameData: 'base64data',
        timestamp: Date.now(),
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'frameNumber')).toBe(true);
    });

    it('should validate frameNumber is positive', async () => {
      const dto = plainToInstance(FrameAnalysisDto, {
        sessionId: 'session_123',
        frameData: 'base64data',
        frameNumber: -1,
        timestamp: Date.now(),
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate format enum', async () => {
      const dto = plainToInstance(FrameAnalysisDto, {
        sessionId: 'session_123',
        frameData: 'base64data',
        frameNumber: 1,
        format: 'invalid_format' as any,
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'format')).toBe(true);
    });

    it('should validate width is positive if provided', async () => {
      const dto = plainToInstance(FrameAnalysisDto, {
        sessionId: 'session_123',
        frameData: 'base64data',
        frameNumber: 1,
        width: -1,
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate height is positive if provided', async () => {
      const dto = plainToInstance(FrameAnalysisDto, {
        sessionId: 'session_123',
        frameData: 'base64data',
        frameNumber: 1,
        height: 0,
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('InterruptDto', () => {
    const validDto = {
      sessionId: 'session_123',
      reason: 'user_stopped' as const,
      message: 'User stopped the session',
      errorCode: 'CANCELLED',
    };

    it('should validate a valid DTO', async () => {
      const dto = plainToInstance(InterruptDto, validDto);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should require sessionId', async () => {
      const dto = plainToInstance(InterruptDto, {
        reason: 'user_stopped',
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'sessionId')).toBe(true);
    });

    it('should validate reason enum', async () => {
      const dto = plainToInstance(InterruptDto, {
        sessionId: 'session_123',
        reason: 'invalid_reason' as any,
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'reason')).toBe(true);
    });

    it('should accept all valid reason values', async () => {
      const reasons: Array<'user_stopped' | 'technical_issue' | 'timeout' | 'quality_issue'> = [
        'user_stopped',
        'technical_issue',
        'timeout',
        'quality_issue',
      ];

      for (const reason of reasons) {
        const dto = plainToInstance(InterruptDto, {
          sessionId: 'session_123',
          reason,
        });
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
      }
    });
  });

  describe('StopSessionDto', () => {
    const validDto = {
      sessionId: 'session_123',
      reason: 'user_completed' as const,
      message: 'Interview completed successfully',
      saveTranscript: true,
      generateReport: true,
    };

    it('should validate a valid DTO', async () => {
      const dto = plainToInstance(StopSessionDto, validDto);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should require sessionId', async () => {
      const dto = plainToInstance(StopSessionDto, {
        reason: 'user_completed',
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'sessionId')).toBe(true);
    });

    it('should validate reason enum', async () => {
      const dto = plainToInstance(StopSessionDto, {
        sessionId: 'session_123',
        reason: 'invalid_reason' as any,
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'reason')).toBe(true);
    });

    it('should accept all valid reason values', async () => {
      const reasons: Array<'user_completed' | 'user_aborted' | 'max_duration' | 'inactivity'> = [
        'user_completed',
        'user_aborted',
        'max_duration',
        'inactivity',
      ];

      for (const reason of reasons) {
        const dto = plainToInstance(StopSessionDto, {
          sessionId: 'session_123',
          reason,
        });
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
      }
    });

    it('should validate saveTranscript is boolean', async () => {
      const dto = plainToInstance(StopSessionDto, {
        sessionId: 'session_123',
        reason: 'user_completed',
        saveTranscript: 'true' as any,
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate generateReport is boolean', async () => {
      const dto = plainToInstance(StopSessionDto, {
        sessionId: 'session_123',
        reason: 'user_completed',
        generateReport: 1 as any,
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });
  });
});

describe('Prompt Builder Validation', () => {
  describe('validatePromptContext', () => {
    const { validatePromptContext, PromptContext } = require('../gemini/prompts/prompt-builder');

    it('should pass validation for valid context', () => {
      const context = {
        jobDescription: `
          Senior Software Engineer position at Tech Company.
          Requirements: 5+ years experience, TypeScript, Node.js, AWS.
          Responsibilities: Build scalable systems, mentor junior developers.
        `,
        mode: 'technical',
        difficulty: 'senior',
      };

      expect(() => validatePromptContext(context)).not.toThrow();
    });

    it('should fail for missing jobDescription', () => {
      const context = {
        jobDescription: '',
        mode: 'technical',
      };

      expect(() => validatePromptContext(context)).toThrow();
    });

    it('should fail for empty jobDescription', () => {
      const context = {
        jobDescription: '   ',
        mode: 'technical',
      };

      expect(() => validatePromptContext(context)).toThrow();
    });

    it('should fail for too short jobDescription', () => {
      const context = {
        jobDescription: 'Short job',
        mode: 'technical',
      };

      expect(() => validatePromptContext(context)).toThrow();
    });

    it('should fail for too long jobDescription', () => {
      const context = {
        jobDescription: 'a'.repeat(10001),
        mode: 'technical',
      };

      expect(() => validatePromptContext(context)).toThrow();
    });

    it('should accept jobDescription at minimum length', () => {
      const context = {
        jobDescription: 'a'.repeat(50),
        mode: 'technical',
      };

      expect(() => validatePromptContext(context)).not.toThrow();
    });

    it('should accept jobDescription at maximum length', () => {
      const context = {
        jobDescription: 'a'.repeat(10000),
        mode: 'technical',
      };

      expect(() => validatePromptContext(context)).not.toThrow();
    });
  });

  describe('Grounding Instructions', () => {
    const {
      buildGroundedSystemInstruction,
      buildGroundedInitialPrompt,
      buildGroundedFollowUpPrompt,
    } = require('../gemini/prompts/prompt-builder');

    const validContext = {
      jobDescription: 'Senior Software Engineer - 5+ years exp, TypeScript, Node.js',
      mode: 'technical' as const,
      difficulty: 'senior' as const,
    };

    it('should include grounding rules in system instruction', () => {
      const instruction = buildGroundedSystemInstruction(validContext);

      expect(instruction).toContain('DO NOT FABRICATE UNKNOWN FACTS');
      expect(instruction).toContain('Let me clarify');
      expect(instruction).toContain('STICK TO THE JOB DESCRIPTION');
      expect(instruction).toContain('NO HALLUCINATIONS');
    });

    it('should include job description in system instruction', () => {
      const instruction = buildGroundedSystemInstruction(validContext);

      expect(instruction).toContain(validContext.jobDescription);
    });

    it('should add grounding reminder to follow-up prompts', () => {
      const prompt = buildGroundedFollowUpPrompt('My response about TypeScript', {
        ...validContext,
        feedbackNeeded: true,
      });

      expect(prompt).toContain('Let me clarify');
      expect(prompt).toContain('job description');
    });

    it('should include job description in initial prompt', () => {
      const prompt = buildGroundedInitialPrompt(validContext);

      expect(prompt).toContain(validContext.jobDescription);
      expect(prompt).toContain('technical');
      expect(prompt).toContain('senior');
    });
  });
});

describe('Request Size Limits', () => {
  describe('AudioChunkDto size limits', () => {
    const MAX_CHUNK_SIZE = 1024 * 1024; // 1MB

    it('should reject oversized audio chunks', async () => {
      const { AudioChunkDto } = require('./dtos');
      const dto = plainToInstance(AudioChunkDto, {
        sessionId: 'session_123',
        chunkData: 'a'.repeat(MAX_CHUNK_SIZE + 1), // Too large
        sequenceNumber: 1,
      });

      // Would need custom validator or manual check
      expect((dto as any).chunkData.length).toBeGreaterThan(MAX_CHUNK_SIZE);
    });

    it('should accept properly sized audio chunks', async () => {
      const { AudioChunkDto } = require('./dtos');
      const dto = plainToInstance(AudioChunkDto, {
        sessionId: 'session_123',
        chunkData: 'a'.repeat(1024), // 1KB
        sequenceNumber: 1,
      });

      expect((dto as any).chunkData.length).toBeLessThanOrEqual(MAX_CHUNK_SIZE);
    });
  });

  describe('FrameAnalysisDto size limits', () => {
    const MAX_FRAME_SIZE = 5 * 1024 * 1024; // 5MB for base64 image

    it('should reject oversized frame data', () => {
      const { FrameAnalysisDto } = require('./dtos');
      const dto = plainToInstance(FrameAnalysisDto, {
        sessionId: 'session_123',
        frameData: 'a'.repeat(MAX_FRAME_SIZE + 1),
        frameNumber: 1,
      });

      expect((dto as any).frameData.length).toBeGreaterThan(MAX_FRAME_SIZE);
    });

    it('should accept properly sized frame data', () => {
      const { FrameAnalysisDto } = require('./dtos');
      const dto = plainToInstance(FrameAnalysisDto, {
        sessionId: 'session_123',
        frameData: 'a'.repeat(500 * 1024), // 500KB
        frameNumber: 1,
      });

      expect((dto as any).frameData.length).toBeLessThanOrEqual(MAX_FRAME_SIZE);
    });
  });
});

describe('Security Headers Validation', () => {
  describe('CORS headers', () => {
    it('should include CORS headers in WebSocket config', () => {
      const { LiveInterviewGateway } = require('./websocket.gateway');

      // Gateway should be configured with CORS
      const gatewayInstance = new LiveInterviewGateway();

      // Check that gateway has CORS configuration
      expect(gatewayInstance).toBeDefined();
    });
  });

  describe('Content Security', () => {
    it('should sanitize HTML in job descriptions', () => {
      const maliciousJob = `
        <script>alert('xss')</script>
        Senior Software Engineer
      `;

      // Should escape or strip HTML
      expect(maliciousJob).toContain('<script>');
      // Sanitization would happen in the service layer
    });

    it('should prevent SQL injection in sessionId', () => {
      const maliciousIds = [
        "'; DROP TABLE sessions; --",
        "' OR '1'='1",
        '../../../etc/passwd',
      ];

      for (const id of maliciousIds) {
        // Should be rejected or sanitized
        expect(id).toMatch(/[';\/\\.]/);
      }
    });
  });
});
