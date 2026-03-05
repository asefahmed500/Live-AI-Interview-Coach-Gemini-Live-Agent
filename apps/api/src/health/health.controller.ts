import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Controller('health')
export class HealthController {
  constructor(
    private config: ConfigService,
    @InjectConnection() private readonly connection: Connection
  ) {}

  @Get()
  check() {
    const mongoState = this.connection.readyState;
    const isHealthy = mongoState === 1;

    return {
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      services: {
        mongodb: {
          status: mongoState === 1 ? 'up' : 'down',
          state: mongoState,
        },
      },
    };
  }

  @Get('live')
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: this.config.get('NODE_ENV', 'development'),
      version: process.env.APP_VERSION || '1.0.0',
    };
  }

  @Get('ready')
  readiness() {
    const mongoState = this.connection.readyState;
    const isReady = mongoState === 1;

    return {
      status: isReady ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      checks: {
        mongodb: mongoState === 1 ? 'connected' : 'disconnected',
      },
    };
  }
}
