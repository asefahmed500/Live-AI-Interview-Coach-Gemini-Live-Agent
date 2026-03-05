import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';

/**
 * Rate limit configuration per client
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

/**
 * Custom rate limiting middleware for WebSocket and HTTP requests
 *
 * Rate limits:
 * - General: 100 requests per minute
 * - Audio streaming: 10 chunks per second
 * - Frame analysis: 2 frames per second
 * - Session creation: 5 per minute
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);

  // Store rate limits per client identifier (IP or socket ID)
  private readonly limits = new Map<string, RateLimitEntry>();

  // Configuration
  private readonly GENERAL_LIMIT = 100; // requests per minute
  private readonly GENERAL_WINDOW = 60000; // 1 minute

  private readonly AUDIO_LIMIT = 10; // chunks per second
  private readonly AUDIO_WINDOW = 1000; // 1 second

  private readonly FRAME_LIMIT = 2; // frames per second
  private readonly FRAME_WINDOW = 1000; // 1 second

  private readonly SESSION_LIMIT = 5; // sessions per minute
  private readonly SESSION_WINDOW = 60000; // 1 minute

  use(req: Request, res: Response, next: NextFunction) {
    const clientId = this.getClientId(req);
    const now = Date.now();

    // Determine limit type based on request
    const limitType = this.getLimitType(req);

    try {
      if (!this.checkRateLimit(clientId, limitType, now)) {
        this.logger.warn(`Rate limit exceeded for client ${clientId} (${limitType})`);

        throw new ForbiddenException({
          message: 'Rate limit exceeded',
          code: 'TOO_MANY_REQUESTS',
          retryAfter: Math.ceil((this.limits.get(clientId)?.resetTime! - now) / 1000),
        });
      }

      next();
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      next();
    }
  }

  /**
   * Get client identifier from request
   */
  private getClientId(req: Request): string {
    // Try to get from various sources
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.ip ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Determine the type of rate limit to apply
   */
  private getLimitType(req: Request): 'general' | 'audio' | 'frame' | 'session' {
    const path = req.path;

    if (path.includes('/audio')) {
      return 'audio';
    }

    if (path.includes('/frame')) {
      return 'frame';
    }

    if (path.includes('/start_session')) {
      return 'session';
    }

    return 'general';
  }

  /**
   * Check if request is within rate limit
   */
  private checkRateLimit(
    clientId: string,
    type: 'general' | 'audio' | 'frame' | 'session',
    now: number
  ): boolean {
    const key = `${clientId}:${type}`;
    const entry = this.limits.get(key);

    // If no entry or window expired, create new entry
    if (!entry || now > entry.resetTime) {
      const limits = this.getLimitsForType(type);

      this.limits.set(key, {
        count: 1,
        resetTime: now + limits.window,
        blocked: false,
      });

      // Cleanup old entries periodically
      if (this.limits.size > 10000) {
        this.cleanup(now);
      }

      return true;
    }

    // Check if blocked
    if (entry.blocked) {
      return false;
    }

    // Increment counter
    entry.count++;

    // Check if limit exceeded
    const limits = this.getLimitsForType(type);
    if (entry.count > limits.max) {
      entry.blocked = true;
      return false;
    }

    return true;
  }

  /**
   * Get limits for a specific type
   */
  private getLimitsForType(type: 'general' | 'audio' | 'frame' | 'session'): {
    max: number;
    window: number;
  } {
    switch (type) {
      case 'audio':
        return { max: this.AUDIO_LIMIT, window: this.AUDIO_WINDOW };
      case 'frame':
        return { max: this.FRAME_LIMIT, window: this.FRAME_WINDOW };
      case 'session':
        return { max: this.SESSION_LIMIT, window: this.SESSION_WINDOW };
      default:
        return { max: this.GENERAL_LIMIT, window: this.GENERAL_WINDOW };
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(now: number): void {
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }

    this.logger.debug(`Cleaned up rate limit entries, current size: ${this.limits.size}`);
  }

  /**
   * Get current stats for monitoring
   */
  getStats(): { totalEntries: number; blockedClients: number } {
    let blockedClients = 0;

    for (const entry of this.limits.values()) {
      if (entry.blocked) {
        blockedClients++;
      }
    }

    return {
      totalEntries: this.limits.size,
      blockedClients,
    };
  }

  /**
   * Reset limits for a specific client (for admin purposes)
   */
  resetClient(clientId: string): void {
    const keysToDelete: string[] = [];

    for (const key of this.limits.keys()) {
      if (key.startsWith(`${clientId}:`)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.limits.delete(key);
    }

    this.logger.log(`Reset rate limits for client: ${clientId}`);
  }
}

/**
 * WebSocket-specific rate limiting decorator
 * Can be applied to WebSocket gateway methods
 */
export function WebSocketRateLimit(options: {
  maxRequests: number;
  perMilliseconds: number;
}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const limits = new Map<string, { count: number; resetTime: number }>();

    descriptor.value = function (...args: any[]) {
      const socket = args[1]; // Socket is usually the second argument
      const clientId = socket.id || socket.handshake.address;
      const now = Date.now();

      const entry = limits.get(clientId);

      if (!entry || now > entry.resetTime) {
        limits.set(clientId, {
          count: 1,
          resetTime: now + options.perMilliseconds,
        });

        return originalMethod.apply(this, args);
      }

      entry.count++;

      if (entry.count > options.maxRequests) {
        socket.emit('error', {
          message: 'Rate limit exceeded',
          code: 'TOO_MANY_REQUESTS',
          retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        });

        return;
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
