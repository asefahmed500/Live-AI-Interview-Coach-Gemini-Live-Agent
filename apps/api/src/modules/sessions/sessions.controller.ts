import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SessionsService } from './sessions.service';
import {
  CreateInterviewSessionDto,
  UpdateInterviewSessionDto,
  AddMessageDto,
  QuerySessionsDto,
} from './dtos';

// TODO: Add AuthGuard when authentication is implemented
// @UseGuards(AuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  /**
   * Get all sessions for the authenticated user
   * GET /api/sessions
   */
  @Get()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async findAll(
    @Query() query: QuerySessionsDto
    // TODO: Get userId from JWT token
    // @CurrentUser('id') userId: string
  ) {
    // TODO: Replace with actual user ID from JWT
    const userId = '000000000000000000000000'; // Placeholder

    return this.sessionsService.findAll(userId, query);
  }

  /**
   * Get active sessions
   * GET /api/sessions/active
   */
  @Get('active')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async findActive() {
    // TODO: Replace with actual user ID from JWT
    const userId = '000000000000000000000000'; // Placeholder

    return this.sessionsService.findActive(userId);
  }

  /**
   * Get completed sessions
   * GET /api/sessions/completed
   */
  @Get('completed')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async findCompleted(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number
  ) {
    // TODO: Replace with actual user ID from JWT
    const userId = '000000000000000000000000'; // Placeholder

    return this.sessionsService.findCompleted(userId, limit);
  }

  /**
   * Get session statistics
   * GET /api/sessions/stats
   */
  @Get('stats')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async getStatistics() {
    // TODO: Replace with actual user ID from JWT
    const userId = '000000000000000000000000'; // Placeholder

    return this.sessionsService.getStatistics(userId);
  }

  /**
   * Get a specific session by ID
   * GET /api/sessions/:id
   */
  @Get(':id')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async findOne(@Param('id') sessionId: string) {
    // TODO: Replace with actual user ID from JWT
    const userId = '000000000000000000000000'; // Placeholder

    return this.sessionsService.findOne(userId, sessionId);
  }

  /**
   * Create a new session
   * POST /api/sessions
   */
  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async create(@Body() createDto: CreateInterviewSessionDto) {
    // TODO: Replace with actual user ID from JWT
    const userId = '000000000000000000000000'; // Placeholder

    return this.sessionsService.create(userId, createDto);
  }

  /**
   * Update a session
   * PUT /api/sessions/:id
   */
  @Put(':id')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async update(
    @Param('id') sessionId: string,
    @Body() updateDto: UpdateInterviewSessionDto
  ) {
    // TODO: Replace with actual user ID from JWT
    const userId = '000000000000000000000000'; // Placeholder

    return this.sessionsService.update(userId, sessionId, updateDto);
  }

  /**
   * Add a message to a session
   * POST /api/sessions/:id/messages
   */
  @Post(':id/messages')
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async addMessage(
    @Param('id') sessionId: string,
    @Body() messageDto: AddMessageDto
  ) {
    // TODO: Replace with actual user ID from JWT
    const userId = '000000000000000000000000'; // Placeholder

    return this.sessionsService.addMessage(userId, sessionId, messageDto);
  }

  /**
   * Update confidence score
   * PUT /api/sessions/:id/confidence
   */
  @Put(':id/confidence')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async updateConfidence(
    @Param('id') sessionId: string,
    @Body('confidence') confidence: number
  ) {
    // TODO: Replace with actual user ID from JWT
    const userId = '000000000000000000000000'; // Placeholder

    return this.sessionsService.updateConfidence(userId, sessionId, confidence);
  }

  /**
   * Delete a session
   * DELETE /api/sessions/:id
   */
  @Delete(':id')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async remove(@Param('id') sessionId: string) {
    // TODO: Replace with actual user ID from JWT
    const userId = '000000000000000000000000'; // Placeholder

    await this.sessionsService.remove(userId, sessionId);
    return { message: 'Session deleted successfully' };
  }
}
