import { Controller, Get, Post, Param, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { ConfidenceEngineService } from './confidence-engine.service';
import { Throttle } from '@nestjs/throttler';

@ApiTags('confidence')
@Controller('confidence')
export class ConfidenceController {
  constructor(private readonly confidenceEngine: ConfidenceEngineService) {}

  /**
   * Calculate confidence for a session
   */
  @Post(':sessionId/calculate')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Calculate confidence score for a session' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Confidence calculated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Session not found' })
  async calculateConfidence(@Param('sessionId') sessionId: string) {
    return await this.confidenceEngine.calculateConfidence(sessionId);
  }

  /**
   * Get confidence history for a session
   */
  @Get(':sessionId/history')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Get confidence history for a session' })
  @ApiResponse({ status: HttpStatus.OK, description: 'History retrieved successfully' })
  async getConfidenceHistory(@Param('sessionId') sessionId: string) {
    return await this.confidenceEngine.getConfidenceHistory(sessionId);
  }

  /**
   * Get session statistics
   */
  @Get(':sessionId/statistics')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Get confidence statistics for a session' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Statistics retrieved successfully' })
  async getSessionStatistics(@Param('sessionId') sessionId: string) {
    return await this.confidenceEngine.getSessionStatistics(sessionId);
  }
}
