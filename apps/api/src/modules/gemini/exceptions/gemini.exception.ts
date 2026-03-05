import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base exception for Gemini-related errors
 */
export class GeminiException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR, errorCode?: string) {
    super(
      {
        message,
        errorCode: errorCode || 'GEMINI_ERROR',
        timestamp: new Date().toISOString(),
      },
      status
    );
    this.name = 'GeminiException';
  }
}

/**
 * Exception for API key errors
 */
export class GeminiApiKeyException extends GeminiException {
  constructor(message: string = 'Invalid or missing Gemini API key') {
    super(message, HttpStatus.UNAUTHORIZED, 'GEMINI_API_KEY_ERROR');
    this.name = 'GeminiApiKeyException';
  }
}

/**
 * Exception for quota/rate limit errors
 */
export class GeminiQuotaException extends GeminiException {
  constructor(message: string = 'Gemini API quota exceeded') {
    super(message, HttpStatus.TOO_MANY_REQUESTS, 'GEMINI_QUOTA_ERROR');
    this.name = 'GeminiQuotaException';
  }
}

/**
 * Exception for session errors
 */
export class GeminiSessionException extends GeminiException {
  constructor(sessionId: string, message: string) {
    super(
      `Session ${sessionId}: ${message}`,
      HttpStatus.BAD_REQUEST,
      'GEMINI_SESSION_ERROR'
    );
    this.name = 'GeminiSessionException';
  }
}

/**
 * Exception for streaming errors
 */
export class GeminiStreamException extends GeminiException {
  constructor(sessionId: string, message: string) {
    super(
      `Stream error for session ${sessionId}: ${message}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'GEMINI_STREAM_ERROR'
    );
    this.name = 'GeminiStreamException';
  }
}

/**
 * Exception for interrupted operations
 */
export class GeminiInterruptedException extends GeminiException {
  constructor(sessionId: string, message: string = 'Operation was interrupted') {
    super(
      `Session ${sessionId} interrupted: ${message}`,
      HttpStatus.OK,
      'GEMINI_INTERRUPTED'
    );
    this.name = 'GeminiInterruptedException';
  }
}

/**
 * Exception for safety filter violations
 */
export class GeminiSafetyException extends GeminiException {
  constructor(message: string = 'Content was blocked by safety filters') {
    super(message, HttpStatus.BAD_REQUEST, 'GEMINI_SAFETY_VIOLATION');
    this.name = 'GeminiSafetyException';
  }
}
