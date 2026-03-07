import { NestFactory } from '@nestjs/core';
import {
  ValidationPipe,
  ValidationError,
  INestApplication,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import helmet from 'helmet';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { RequestSizeMiddleware } from './common/middleware/request-size.middleware';
import { RateLimitMiddleware } from './common/guards/rate-limit.guard';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);

  // Use Winston logger
  app.useLogger(logger);

  // Security: Custom security headers middleware (before Helmet)
  const securityHeadersMiddleware = new SecurityHeadersMiddleware();
  app.use((req, res, next) => securityHeadersMiddleware.use(req, res, next));

  // Request size limits middleware
  const requestSizeMiddleware = new RequestSizeMiddleware();
  app.use((req, res, next) => requestSizeMiddleware.use(req, res, next));

  // Rate limiting middleware
  const rateLimitMiddleware = new RateLimitMiddleware();
  app.use((req, res, next) => rateLimitMiddleware.use(req, res, next));

  // Security: Helmet (additional security)
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false, // Using our own CSP above
    })
  );

  // Compression
  app.use(compression());

  // CORS Configuration
  const allowedOrigins = configService
    .get<string>('CORS_ORIGINS', 'http://localhost:3000')
    .split(',');

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origin not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global Validation Pipe with strict mode
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors: ValidationError[]) => {
        const messages = errors.map(
          (error) => `${error.property}: ${Object.values(error.constraints || {}).join(', ')}`
        );
        return new BadRequestException({
          message: 'Validation failed',
          errors: messages,
        });
      },
    })
  );

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter(logger));

  // Global Transform Interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  // Trust proxy for proper X-Forwarded-* headers
  app.set('trust proxy', 1);

  // API Prefix
  const apiPrefix = configService.get<string>('API_PREFIX', 'api');
  app.setGlobalPrefix(apiPrefix);

  // Cloud Run uses PORT env var, otherwise use API_PORT, default to 3001
  const port = process.env.PORT
    ? parseInt(process.env.PORT, 10)
    : configService.get<number>('API_PORT', 3001);
  const host = configService.get<string>('API_HOST', '0.0.0.0');

  await app.listen(port, host);

  // Startup logging
  logger.log('=================================');
  logger.log(`Application is starting...`, 'Bootstrap');
  logger.log(`Environment: ${configService.get<string>('NODE_ENV', 'development')}`, 'Bootstrap');
  logger.log(`API URL: http://${host}:${port}/${apiPrefix}`, 'Bootstrap');
  logger.log(`Health Check: http://${host}:${port}/${apiPrefix}/health`, 'Bootstrap');
  logger.log(`WebSocket: ws://${host}:${port}`, 'Bootstrap');
  logger.log(`Better Auth: http://${host}:${port}/${apiPrefix}/auth/health`, 'Bootstrap');
  logger.log('=================================', 'Bootstrap');

  // Graceful shutdown handling
  setupGracefulShutdown(app, logger);
}

function setupGracefulShutdown(app: INestApplication, logger: any): void {
  const gracefulShutdown = async (signal: string): Promise<void> => {
    logger.log(`Received ${signal}. Starting graceful shutdown...`, 'Shutdown');

    const shutdownStart = Date.now();

    try {
      // Stop accepting new connections
      await app.close();

      const elapsed = Date.now() - shutdownStart;
      logger.log(`Application closed gracefully in ${elapsed}ms`, 'Shutdown');

      process.exit(0);
    } catch (error) {
      logger.error(`Error during graceful shutdown: ${error}`, 'Shutdown');
      process.exit(1);
    }
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error(`Uncaught Exception: ${error.message}`, 'Shutdown', error.stack);
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    logger.error(`Unhandled Rejection: ${reason}`, 'Shutdown');
    process.exit(1);
  });

  // Handle MongoDB connection errors
  process.on('SIGUSR2', () => {
    logger.log('Received SIGUSR2. Restarting...', 'Shutdown');
    process.kill(process.pid, 'SIGINT');
  });
}

bootstrap().catch((error) => {
  console.error('Error starting application:', error);
  process.exit(1);
});
