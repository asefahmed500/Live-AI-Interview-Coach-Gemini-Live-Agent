import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class MongooseHealthIndicator extends HealthIndicator {
  constructor(@InjectConnection() private readonly connection: Connection) {
    super();
  }

  async isHealthy(key: string = 'mongoose'): Promise<HealthIndicatorResult> {
    try {
      const isReady = this.connection.readyState === 1;

      if (!isReady) {
        throw new HealthCheckError('Mongoose connection failed', this.getStatus(key, false));
      }

      return this.getStatus(key, true);
    } catch (error) {
      if (error instanceof HealthCheckError) {
        throw error;
      }
      throw new HealthCheckError('Mongoose health check failed', this.getStatus(key, false, { error: (error as Error).message }));
    }
  }
}
