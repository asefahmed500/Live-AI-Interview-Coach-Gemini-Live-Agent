import { Controller, Get, Post, Param, HttpCode, HttpStatus } from '@nestjs/common';

import { ConfidenceEngineService } from './confidence-engine.service';
import { Throttle } from '@nestjs/throttler';

@Controller('confidence')
export class ConfidenceController {
  constructor(private readonly confidenceEngine: ConfidenceEngineService) {}

  /**
   * Calculate confidence for a session
   */
  @Post(':sessionId/calculate')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async calculateConfidence(@Param('sessionId') sessionId: string) {
    return await this.confidenceEngine.calculateConfidence(sessionId);
  }

  /**
   * Get confidence history for a session
   */
  @Get(':sessionId/history')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getConfidenceHistory(@Param('sessionId') sessionId: string) {
    return await this.confidenceEngine.getConfidenceHistory(sessionId);
  }

  /**
   * Get session statistics
   */
  @Get(':sessionId/statistics')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getSessionStatistics(@Param('sessionId') sessionId: string) {
    return await this.confidenceEngine.getSessionStatistics(sessionId);
  }
}
