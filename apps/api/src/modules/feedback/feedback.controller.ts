import { Controller, Get, Post, Put, Delete, Param, Query, Body, Request } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dtos/create-feedback.dto';
import { UpdateFeedbackDto } from './dtos/update-feedback.dto';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  /**
   * Get all feedback for current user
   * Optional: filter by session
   */
  @Get()
  async findAll(@Request() req: any, @Query('sessionId') sessionId?: string) {
    // TODO: Implement Better Auth session validation
    const userId = req.user?.id || 'demo-user';
    return this.feedbackService.findAll(userId, sessionId);
  }

  /**
   * Get feedback by ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.id || 'demo-user';
    return this.feedbackService.findOne(id, userId);
  }

  /**
   * Get all feedback for a specific session
   */
  @Get('session/:sessionId')
  async findBySession(@Param('sessionId') sessionId: string, @Request() req: any) {
    const userId = req.user?.id || 'demo-user';
    return this.feedbackService.findBySession(sessionId, userId);
  }

  /**
   * Get comprehensive feedback for a session
   */
  @Get('session/:sessionId/comprehensive')
  async findComprehensiveBySession(@Param('sessionId') sessionId: string, @Request() req: any) {
    const userId = req.user?.id || 'demo-user';
    return this.feedbackService.findComprehensiveBySession(sessionId, userId);
  }

  /**
   * Get average scores by user
   */
  @Get('user/average-scores')
  async getAverageScores(@Request() req: any) {
    const userId = req.user?.id || 'demo-user';
    return this.feedbackService.getAverageScores(userId);
  }

  /**
   * Create new feedback
   */
  @Post()
  async create(@Body() createFeedbackDto: CreateFeedbackDto, @Request() req: any) {
    const userId = req.user?.id || 'demo-user';
    return this.feedbackService.create(createFeedbackDto, userId);
  }

  /**
   * Update feedback
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateFeedbackDto: UpdateFeedbackDto, @Request() req: any) {
    const userId = req.user?.id || 'demo-user';
    return this.feedbackService.update(id, updateFeedbackDto, userId);
  }

  /**
   * Delete feedback
   */
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.id || 'demo-user';
    return this.feedbackService.remove(id, userId);
  }
}
