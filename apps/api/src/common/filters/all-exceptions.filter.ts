import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WinstonLogger } from 'nest-winston';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly winstonLogger: WinstonLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const errorResponse =
      typeof message === 'string'
        ? { message }
        : (message as Record<string, unknown>);

    // Log all uncaught exceptions
    this.logError(request, status, exception);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message:
        (errorResponse as any).message || 'An unexpected error occurred',
      ...(process.env.NODE_ENV === 'development' && {
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    });
  }

  private logError(request: Request, status: number, exception: unknown): void {
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const error =
      exception instanceof Error
        ? { message: exception.message, stack: exception.stack }
        : { message: String(exception) };

    this.winstonLogger.error(
      `${method} ${url} - ${status} - ${ip} - ${userAgent} ` +
      JSON.stringify({ statusCode: status, error })
    );
  }
}
