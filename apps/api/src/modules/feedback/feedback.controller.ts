import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CreateFeedbackDto } from './dtos/create-feedback.dto';
import { UpdateFeedbackDto } from './dtos/update-feedback.dto';

@Controller('feedback')
@UseGuards(AuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  /**
   * Get all feedback for current user
   * Optional: filter by session
   */
  @Get()
  async findAll(@Request() req: any, @Query('sessionId') sessionId?: string) {
    return this.feedbackService.findAll(req.userId, sessionId);
  }

  /**
   * Get feedback by ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.feedbackService.findOne(id, req.userId);
  }

  /**
   * Get all feedback for a specific session
   */
  @Get('session/:sessionId')
  async findBySession(@Param('sessionId') sessionId: string, @Request() req: any) {
    return this.feedbackService.findBySession(sessionId, req.userId);
  }

  /**
   * Get comprehensive feedback for a session
   */
  @Get('session/:sessionId/comprehensive')
  async findComprehensiveBySession(@Param('sessionId') sessionId: string, @Request() req: any) {
    return this.feedbackService.findComprehensiveBySession(sessionId, req.userId);
  }

  /**
   * Get average scores by user
   */
  @Get('user/average-scores')
  async getAverageScores(@Request() req: any) {
    return this.feedbackService.getAverageScores(req.userId);
  }

  /**
   * Create new feedback
   */
  @Post()
  async create(@Body() createFeedbackDto: CreateFeedbackDto, @Request() req: any) {
    return this.feedbackService.create(createFeedbackDto, req.userId);
  }

  /**
   * Update feedback
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateFeedbackDto: UpdateFeedbackDto, @Request() req: any) {
    return this.feedbackService.update(id, updateFeedbackDto, req.userId);
  }

  /**
   * Delete feedback
   */
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.feedbackService.remove(id, req.userId);
  }
}
