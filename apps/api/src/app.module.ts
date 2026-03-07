import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

import { validate } from './config/validation.schema';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { BetterAuthModule } from './modules/better-auth/better-auth.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { GeminiModule } from './modules/gemini';
import { ConfidenceModule } from './modules/confidence';
import { LoggerService } from './common/services/logger.service';

const isDevelopment = process.env.NODE_ENV !== 'production';

@Module({
  imports: [
    // Configuration with validation
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate,
      cache: true,
    }),

    // Throttler / Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL', 60000), // 60 seconds
          limit: config.get<number>('THROTTLE_LIMIT', 100), // 100 requests per TTL
        },
      ],
    }),

    // Winston Logger
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (_config: ConfigService) => ({
        transports: [
          // Console transport
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
              winston.format.colorize({ all: true }),
              winston.format.printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
            ),
          }),
        ],
      }),
    }),

    // MongoDB
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('MONGODB_URI');
        return {
          uri,
          connectionFactory: (connection) => {
            const { AutoTimestampPlugin } = require('./database/plugins/auto-timestamp.plugin');
            connection.plugin(AutoTimestampPlugin);
            connection.on('connected', () => {});
            connection.on('error', (err) => {});
            connection.on('disconnected', () => {});
            return connection;
          },
        };
      },
    }),

    // Feature Modules
    DatabaseModule,
    HealthModule,
    BetterAuthModule, // Better Auth module
    SessionsModule,
    FeedbackModule,
    WebSocketModule,
    GeminiModule,
    ConfidenceModule,
  ],
  controllers: [],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class AppModule {}
