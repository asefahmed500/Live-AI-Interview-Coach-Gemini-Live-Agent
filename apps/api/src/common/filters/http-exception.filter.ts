import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WinstonLogger } from 'nest-winston';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly winstonLogger: WinstonLogger) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Format error response
    const error =
      typeof exceptionResponse === 'string'
        ? { message: exceptionResponse }
        : (exceptionResponse as Record<string, unknown>);

    // Log error
    this.logError(request, status, error);

    // Send response
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: (error as any).message || 'An error occurred',
      errors: (error as any).errors,
      ...(process.env.NODE_ENV === 'development' && { stack: exception.stack }),
    });
  }

  private logError(request: Request, status: number, error: any): void {
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';

    const message = `${method} ${url} - ${status} - ${ip} - ${userAgent}`;
    const meta = JSON.stringify({
      statusCode: status,
      error: error.message,
      stack: error.stack,
    });

    if (status >= 500) {
      this.winstonLogger.error(message + ' ' + meta);
    } else if (status >= 400) {
      this.winstonLogger.warn(message + ' ' + JSON.stringify({ statusCode: status, error: error.message }));
    } else {
      this.winstonLogger.log(message + ' ' + JSON.stringify({ statusCode: status }));
    }
  }
}
