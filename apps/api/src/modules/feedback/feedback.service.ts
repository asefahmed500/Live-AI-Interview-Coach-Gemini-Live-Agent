import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Feedback, FeedbackDocument, FeedbackModel } from './schemas/feedback.schema';
import { CreateFeedbackDto } from './dtos/create-feedback.dto';
import { UpdateFeedbackDto } from './dtos/update-feedback.dto';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectModel(Feedback.name) private feedbackModel: FeedbackModel,
  ) {}

  /**
   * Create new feedback
   */
  async create(createFeedbackDto: CreateFeedbackDto, userId: string) {
    const feedback = await this.feedbackModel.create({
      ...createFeedbackDto,
      userId: new Types.ObjectId(userId),
    });

    this.logger.log(`Feedback created: ${feedback.id} for session: ${feedback.sessionId}`);

    return {
      id: feedback.id,
      sessionId: feedback.sessionId.toString(),
      type: feedback.type,
      score: feedback.score,
      message: feedback.message,
      suggestions: feedback.suggestions,
      metrics: feedback.metrics,
      strengths: feedback.strengths,
      improvements: feedback.improvements,
      createdAt: feedback.createdAt,
    };
  }

  /**
   * Find all feedback for a user
   */
  async findAll(userId: string, sessionId?: string) {
    const query: any = { userId: new Types.ObjectId(userId) };

    if (sessionId) {
      query.sessionId = new Types.ObjectId(sessionId);
    }

    const feedback = await this.feedbackModel.find(query).sort({ createdAt: -1 });

    return feedback.map((f) => ({
      id: f.id,
      sessionId: f.sessionId.toString(),
      type: f.type,
      score: f.score,
      message: f.message,
      suggestions: f.suggestions,
      metrics: f.metrics,
      strengths: f.strengths,
      improvements: f.improvements,
      createdAt: f.createdAt,
    }));
  }

  /**
   * Find feedback by ID
   */
  async findOne(id: string, userId: string) {
    const feedback = await this.feedbackModel.findOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    });

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    return {
      id: feedback.id,
      sessionId: feedback.sessionId.toString(),
      type: feedback.type,
      score: feedback.score,
      message: feedback.message,
      suggestions: feedback.suggestions,
      metrics: feedback.metrics,
      strengths: feedback.strengths,
      improvements: feedback.improvements,
      createdAt: feedback.createdAt,
    };
  }

  /**
   * Find all feedback for a session
   */
  async findBySession(sessionId: string, userId: string) {
    const feedback = await this.feedbackModel.find({
      sessionId: new Types.ObjectId(sessionId),
      userId: new Types.ObjectId(userId),
    }).sort({ createdAt: 1 });

    return feedback.map((f) => ({
      id: f.id,
      sessionId: f.sessionId.toString(),
      type: f.type,
      score: f.score,
      message: f.message,
      suggestions: f.suggestions,
      metrics: f.metrics,
      strengths: f.strengths,
      improvements: f.improvements,
      createdAt: f.createdAt,
    }));
  }

  /**
   * Find comprehensive feedback for a session
   */
  async findComprehensiveBySession(sessionId: string, userId: string) {
    const feedback = await this.feedbackModel.findOne({
      sessionId: new Types.ObjectId(sessionId),
      userId: new Types.ObjectId(userId),
      type: 'comprehensive',
    });

    if (!feedback) {
      throw new NotFoundException('Comprehensive feedback not found for this session');
    }

    return {
      id: feedback.id,
      sessionId: feedback.sessionId.toString(),
      type: feedback.type,
      score: feedback.score,
      message: feedback.message,
      suggestions: feedback.suggestions,
      metrics: feedback.metrics,
      strengths: feedback.strengths,
      improvements: feedback.improvements,
      createdAt: feedback.createdAt,
    };
  }

  /**
   * Update feedback
   */
  async update(id: string, updateFeedbackDto: UpdateFeedbackDto, userId: string) {
    const feedback = await this.feedbackModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      },
      { $set: updateFeedbackDto },
      { new: true },
    );

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    this.logger.log(`Feedback updated: ${id}`);

    return {
      id: feedback.id,
      sessionId: feedback.sessionId.toString(),
      type: feedback.type,
      score: feedback.score,
      message: feedback.message,
      suggestions: feedback.suggestions,
      metrics: feedback.metrics,
      strengths: feedback.strengths,
      improvements: feedback.improvements,
      createdAt: feedback.createdAt,
      updatedAt: feedback.updatedAt,
    };
  }

  /**
   * Delete feedback
   */
  async remove(id: string, userId: string) {
    const feedback = await this.feedbackModel.findOneAndDelete({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    });

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    this.logger.log(`Feedback deleted: ${id}`);

    return {
      id: feedback.id,
      message: 'Feedback deleted successfully',
    };
  }

  /**
   * Get average scores by user
   */
  async getAverageScores(userId: string) {
    const results = await this.feedbackModel.getAverageScoresByUser(
      new Types.ObjectId(userId),
    );

    return results.map((r: any) => ({
      type: r._id,
      averageScore: Math.round(r.averageScore * 10) / 10,
      count: r.count,
    }));
  }

  /**
   * Generate comprehensive feedback for a session
   */
  async generateComprehensiveFeedback(
    sessionId: string,
    userId: string,
    sessionData: {
      transcript: Array<{ role: string; content: string }>;
      confidenceHistory: number[];
      averageConfidence: number;
    },
  ) {
    // Calculate metrics
    const avgConfidence = sessionData.averageConfidence || 0;
    const userMessages = sessionData.transcript.filter((m) => m.role === 'user');
    const assistantMessages = sessionData.transcript.filter((m) => m.role === 'assistant');

    // Generate feedback based on session performance
    let score = 0;
    const message = [];
    const suggestions = [];
    const strengths = [];
    const improvements = [];
    const metrics: Record<string, number> = {};

    // Confidence scoring
    metrics.confidenceLevel = Math.round((avgConfidence / 10) * 100);
    if (avgConfidence >= 7) {
      score += 3;
      strengths.push('Strong confidence throughout the interview');
    } else if (avgConfidence >= 5) {
      score += 2;
      improvements.push('Work on maintaining consistent confidence');
    } else {
      score += 1;
      improvements.push('Significant improvement needed in confidence');
      suggestions.push('Practice relaxation techniques before interviews');
    }

    // Engagement scoring
    metrics.engagement = Math.min(100, Math.round((userMessages.length / assistantMessages.length) * 80));
    if (userMessages.length >= assistantMessages.length * 0.7) {
      score += 2;
      strengths.push('Good engagement with the interviewer');
    } else {
      score += 1;
      improvements.push('Provide more detailed responses');
      suggestions.push('Practice the STAR method for behavioral questions');
    }

    // Content quality scoring
    const avgMessageLength = userMessages.reduce((sum, m) => sum + m.content.length, 0) / Math.max(userMessages.length, 1);
    metrics.contentQuality = Math.min(100, Math.round((avgMessageLength / 500) * 100));
    if (avgMessageLength > 300) {
      score += 2;
      strengths.push('Comprehensive and detailed answers');
    } else if (avgMessageLength > 150) {
      score += 1;
      improvements.push('Elaborate more on your answers');
    } else {
      improvements.push('Answers are too brief');
      suggestions.push('Use examples and stories to illustrate your points');
    }

    // Speech clarity (placeholder - would be calculated from audio analysis)
    metrics.speechClarity = 75;
    if (metrics.speechClarity >= 80) {
      score += 1;
    } else {
      suggestions.push('Practice speaking more clearly and at a moderate pace');
    }

    // Normalize score to 0-10
    score = Math.min(10, score);

    // Generate overall message
    if (score >= 8) {
      message.push('Excellent interview performance!');
    } else if (score >= 6) {
      message.push('Good interview with room for improvement.');
    } else if (score >= 4) {
      message.push('Fair performance. Consider practicing more.');
    } else {
      message.push('Needs significant improvement. Keep practicing!');
    }

    // Create feedback
    const feedback = await this.feedbackModel.create({
      sessionId: new Types.ObjectId(sessionId),
      userId: new Types.ObjectId(userId),
      type: 'comprehensive',
      score,
      message: message.join(' '),
      suggestions,
      metrics,
      strengths,
      improvements,
    });

    this.logger.log(`Comprehensive feedback generated: ${feedback.id} for session: ${sessionId}`);

    return {
      id: feedback.id,
      sessionId: feedback.sessionId.toString(),
      type: feedback.type,
      score: feedback.score,
      message: feedback.message,
      suggestions: feedback.suggestions,
      metrics: feedback.metrics,
      strengths: feedback.strengths,
      improvements: feedback.improvements,
      createdAt: feedback.createdAt,
    };
  }
}
