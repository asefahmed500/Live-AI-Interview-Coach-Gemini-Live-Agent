import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';

/**
 * Security headers middleware
 *
 * Applies comprehensive security headers to all HTTP responses
 * following OWASP security best practices
 */
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityHeadersMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Enable XSS filter
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        "connect-src 'self' wss: ws:",
        "media-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests",
      ].join('; ')
    );

    // Permissions policy (formerly Feature-Policy)
    res.setHeader(
      'Permissions-Policy',
      [
        'camera=(self)',
        'microphone=(self)',
        'speaker=(self)',
        'geolocation=()',
        'payment=()',
        'usb=()',
        'magnetometer=()',
        'gyroscope=()',
        'accelerometer=()',
      ].join(', ')
    );

    // Strict-Transport-Security (only in production with HTTPS)
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    // API-specific headers
    res.setHeader('X-API-Version', '1.0');
    res.setHeader('X-Request-ID', this.generateRequestId());

    // Cache control for API endpoints
    if (req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    // Remove server information
    res.removeHeader('X-Powered-By');

    // CORS headers (if not already set)
    if (!res.getHeader('Access-Control-Allow-Origin')) {
      this.setCORSHeaders(req, res);
    }

    next();
  }

  /**
   * Set CORS headers based on origin
   */
  private setCORSHeaders(req: Request, res: Response): void {
    const origin = req.headers['origin'] as string;

    // In production, whitelist allowed origins
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
    ];

    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Request-ID, X-Client-Version'
      );
      res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}

/**
 * Input sanitization utilities
 */
export class InputSanitizer {
  private static readonly logger = new Logger(InputSanitizer.name);

  /**
   * Sanitize string input to prevent XSS
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return input;
    }

    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Sanitize HTML content
   */
  static sanitizeHTML(input: string): string {
    // Remove potentially dangerous HTML tags
    const dangerousTags = [
      '<script',
      '</script',
      '<iframe',
      '</iframe',
      '<object',
      '</object',
      '<embed',
      '</embed',
      '<form',
      '</form',
      '<input',
      '<button',
      '<link',
      '<meta',
      '<style',
      '</style',
    ];

    let sanitized = input;
    for (const tag of dangerousTags) {
      sanitized = sanitized.replace(new RegExp(tag, 'gi'), '');
    }

    // Remove event handlers
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');

    return sanitized;
  }

  /**
   * Validate and sanitize sessionId
   */
  static validateSessionId(sessionId: string): boolean {
    // Session IDs should be alphanumeric with underscores
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    return validPattern.test(sessionId) && sessionId.length >= 10 && sessionId.length <= 100;
  }

  /**
   * Validate job description for malicious content
   */
  static validateJobDescription(jobDescription: string): {
    valid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // Check for potential XSS
    if (/<script|javascript:|onerror=|onload=/i.test(jobDescription)) {
      warnings.push('Job description contains potentially dangerous content');
    }

    // Check for SQL injection patterns
    if (/('|('')|;|--|\| UNION |SELECT |DROP |DELETE |INSERT )/i.test(jobDescription)) {
      warnings.push('Job description contains suspicious SQL patterns');
    }

    // Check for path traversal
    if (/\.\.[\/\\]/.test(jobDescription)) {
      warnings.push('Job description contains path traversal patterns');
    }

    return {
      valid: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Sanitize error messages before sending to client
   */
  static sanitizeErrorMessage(error: Error): string {
    // Don't leak internal error details
    const dangerousPatterns = [
      /at\s+.*\s+\(.*\)/, // Stack traces
      /C:\\|\/[a-z_]+\/.*\.(js|ts|sql)/i, // File paths
      /MySQL|MongoDB|PostgreSQL|Prisma/i, // Database names
      /password|secret|token/i, // Sensitive fields
    ];

    let sanitized = error.message;

    for (const pattern of dangerousPatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    return sanitized;
  }

  /**
   * Validate file upload metadata
   */
  static validateFileUpload(metadata: {
    filename: string;
    mimetype: string;
    size: number;
  }): { valid: boolean; error?: string } {
    // Check filename
    if (!metadata.filename || metadata.filename.length > 255) {
      return { valid: false, error: 'Invalid filename' };
    }

    // Check for path traversal in filename
    if (/\.\./.test(metadata.filename) || metadata.filename.includes('/') || metadata.filename.includes('\\')) {
      return { valid: false, error: 'Invalid filename (path traversal detected)' };
    }

    // Check allowed MIME types
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'audio/webm',
      'audio/ogg',
      'audio/mp4',
    ];

    if (!allowedMimeTypes.includes(metadata.mimetype)) {
      return { valid: false, error: `Invalid MIME type: ${metadata.mimetype}` };
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (metadata.size > maxSize) {
      return { valid: false, error: 'File size exceeds maximum allowed size' };
    }

    return { valid: true };
  }

  /**
   * Rate limit key generator (safe from injection)
   */
  static generateRateLimitKey(identifier: string, type: string): string {
    // Use a simple hash instead of direct concatenation
    const combined = `${type}:${identifier}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `rl:${Math.abs(hash).toString(36)}`;
  }
}

/**
 * WebSocket security utilities
 */
export class WebSocketSecurity {
  private static readonly logger = new Logger(WebSocketSecurity.name);

  /**
   * Validate WebSocket handshake
   */
  static validateHandshake(handshake: any): { valid: boolean; error?: string } {
    const origin = handshake.headers.origin;

    // Validate origin in production
    if (process.env.NODE_ENV === 'production') {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
      if (!allowedOrigins.includes(origin)) {
        return { valid: false, error: 'Origin not allowed' };
      }
    }

    // Check for suspicious headers
    const suspiciousHeaders = ['x-real-ip', 'x-forwarded-for'];
    for (const header of suspiciousHeaders) {
      const value = handshake.headers[header];
      if (value && this.isSuspiciousIP(value as string)) {
        return { valid: false, error: 'Suspicious IP address' };
      }
    }

    return { valid: true };
  }

  /**
   * Check if IP is suspicious
   */
  private static isSuspiciousIP(ip: string): boolean {
    // Check for private IPs in public-facing context
    const privateIPPatterns = [
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^127\./,
      /^localhost$/i,
      /^::1$/,
      /^0:0:0:0:0:0:0:1$/,
    ];

    // In production, be suspicious of private IPs
    if (process.env.NODE_ENV === 'production') {
      return privateIPPatterns.some((pattern) => pattern.test(ip));
    }

    return false;
  }

  /**
   * Sanitize WebSocket message data
   */
  static sanitizeMessage(event: string, data: any): any {
    // Sanitize string fields
    if (typeof data === 'string') {
      return InputSanitizer.sanitizeString(data);
    }

    // Sanitize object fields recursively
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};

      for (const [key, value] of Object.entries(data)) {
        // Skip prototype properties
        if (!Object.prototype.hasOwnProperty.call(data, key)) {
          continue;
        }

        // Sanitize key
        const safeKey = InputSanitizer.sanitizeString(key);

        // Sanitize value based on type
        if (typeof value === 'string') {
          sanitized[safeKey] = InputSanitizer.sanitizeString(value);
        } else if (typeof value === 'object' && value !== null) {
          sanitized[safeKey] = this.sanitizeMessage(key, value);
        } else {
          sanitized[safeKey] = value;
        }
      }

      return sanitized;
    }

    return data;
  }
}
