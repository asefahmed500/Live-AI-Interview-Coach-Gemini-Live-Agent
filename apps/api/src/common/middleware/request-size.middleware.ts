import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';

/**
 * Request size limits configuration
 */
const SIZE_LIMITS = {
  // Audio chunks: 1MB max (compressed)
  AUDIO_CHUNK_MAX_SIZE: 1 * 1024 * 1024,

  // Frame analysis: 5MB max (base64 encoded image)
  FRAME_MAX_SIZE: 5 * 1024 * 1024,

  // Job description: 10KB max
  JOB_DESCRIPTION_MAX_SIZE: 10 * 1024,

  // General request body: 10MB max
  GENERAL_MAX_SIZE: 10 * 1024 * 1024,

  // WebSocket message size: 1MB max
  WEBSOCKET_MESSAGE_MAX_SIZE: 1 * 1024 * 1024,
};

/**
 * Middleware to validate request sizes
 */
@Injectable()
export class RequestSizeMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestSizeMiddleware.name);

  use(req: Request, _res: Response, next: NextFunction) {
    try {
      this.validateRequestSize(req);
      next();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      next();
    }
  }

  /**
   * Validate request size based on type
   */
  private validateRequestSize(req: Request): void {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    const path = req.path;

    // Skip validation for GET requests
    if (req.method === 'GET') {
      return;
    }

    // Determine appropriate size limit
    let maxSize = SIZE_LIMITS.GENERAL_MAX_SIZE;

    if (path.includes('/audio')) {
      maxSize = SIZE_LIMITS.AUDIO_CHUNK_MAX_SIZE;
    } else if (path.includes('/frame')) {
      maxSize = SIZE_LIMITS.FRAME_MAX_SIZE;
    } else if (path.includes('/start_session')) {
      maxSize = SIZE_LIMITS.JOB_DESCRIPTION_MAX_SIZE;
    }

    // Check content length
    if (contentLength > maxSize) {
      this.logger.warn(`Request size exceeded: ${contentLength} bytes (max: ${maxSize} bytes)`);

      throw new BadRequestException({
        message: `Request size exceeds maximum allowed size of ${this.formatBytes(maxSize)}`,
        code: 'REQUEST_TOO_LARGE',
        maxSize,
        actualSize: contentLength,
      });
    }

    // For multipart/form-data, also check the body
    if (req.body) {
      const bodySize = JSON.stringify(req.body).length;

      if (bodySize > SIZE_LIMITS.GENERAL_MAX_SIZE) {
        this.logger.warn(`Body size exceeded: ${bodySize} bytes`);

        throw new BadRequestException({
          message: `Request body size exceeds maximum allowed size`,
          code: 'BODY_TOO_LARGE',
        });
      }
    }
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

/**
 * DTO decorator to validate string length
 */
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function MaxStringLength(maxBytes: number, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'maxStringLength',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [maxBytes],
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') {
            return false;
          }

          // Calculate byte size (UTF-8)
          const byteSize = Buffer.byteLength(value, 'utf8');
          return byteSize <= maxBytes;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must not exceed ${args.constraints[0]} bytes`;
        },
      },
    });
  };
}

/**
 * DTO decorator to validate base64 data size
 */
export function MaxBase64Size(maxBytes: number, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'maxBase64Size',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [maxBytes],
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') {
            return false;
          }

          // Base64 encoded size should be ~33% larger than original
          const estimatedOriginalSize = Math.floor((value.length * 3) / 4);
          return estimatedOriginalSize <= maxBytes;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} decoded size must not exceed ${args.constraints[0]} bytes`;
        },
      },
    });
  };
}

/**
 * Size limit constants for use in DTOs
 */
export { SIZE_LIMITS };
