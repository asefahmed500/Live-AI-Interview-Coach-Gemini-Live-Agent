import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, PipelineStage } from 'mongoose';
import { InterviewSession, InterviewSessionDocument } from './schemas/interview-session.schema';
import {
  CreateInterviewSessionDto,
  UpdateInterviewSessionDto,
  AddMessageDto,
  QuerySessionsDto,
} from './dtos';
import { Message } from './schemas/interview-session.schema';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    @InjectModel(InterviewSession.name)
    private readonly interviewSessionModel: Model<InterviewSessionDocument>
  ) {}

  /**
   * Create a new interview session
   */
  async create(
    userId: string,
    createDto: CreateInterviewSessionDto
  ): Promise<InterviewSessionDocument> {
    this.logger.log(`Creating new session for user: ${userId}`);

    const session = new this.interviewSessionModel({
      userId: new Types.ObjectId(userId),
      jobDescription: createDto.jobDescription,
      status: createDto.status || 'idle',
      transcript: createDto.initialMessage
        ? [
            {
              role: 'user',
              content: createDto.initialMessage,
              timestamp: new Date(),
            },
          ]
        : [],
      confidenceHistory: [],
    });

    const saved = await session.save();

    // If status is active, set startedAt
    if (saved.status === 'active' && !saved.startedAt) {
      saved.startedAt = new Date();
      await saved.save();
    }

    this.logger.log(`Session created: ${saved.id}`);
    return saved;
  }

  /**
   * Find all sessions for a user with optional filtering
   */
  async findAll(
    userId: string,
    query?: QuerySessionsDto
  ): Promise<{ sessions: InterviewSessionDocument[]; total: number }> {
    const filter: any = {
      userId: new Types.ObjectId(userId),
    };

    // Apply status filter
    if (query?.status) {
      filter.status = query.status;
    } else if (!query?.includeCompleted) {
      filter.status = { $in: ['idle', 'active', 'paused'] };
    }

    // Apply search filter
    if (query?.search) {
      filter.$or = [
        { jobDescription: { $regex: query.search, $options: 'i' } },
        { 'transcript.content': { $regex: query.search, $options: 'i' } },
      ];
    }

    const limit = query?.limit || 10;
    const skip = query?.skip || 0;

    const [sessions, total] = await Promise.all([
      this.interviewSessionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip),
      this.interviewSessionModel.countDocuments(filter),
    ]);

    this.logger.log(`Found ${sessions.length} sessions for user: ${userId}`);
    return { sessions: sessions as InterviewSessionDocument[], total };
  }

  /**
   * Find active sessions for a user
   */
  async findActive(userId: string): Promise<InterviewSessionDocument[]> {
    const sessions = await this.interviewSessionModel
      .find({
        userId: new Types.ObjectId(userId),
        status: { $in: ['idle', 'active', 'paused'] },
      })
      .sort({ createdAt: -1 });

    this.logger.log(`Found ${sessions.length} active sessions for user: ${userId}`);
    return sessions as InterviewSessionDocument[];
  }

  /**
   * Find completed sessions for a user
   */
  async findCompleted(
    userId: string,
    limit = 10
  ): Promise<InterviewSessionDocument[]> {
    const sessions = await this.interviewSessionModel
      .find({
        userId: new Types.ObjectId(userId),
        status: 'completed',
      })
      .sort({ completedAt: -1 })
      .limit(limit);

    this.logger.log(`Found ${sessions.length} completed sessions for user: ${userId}`);
    return sessions as InterviewSessionDocument[];
  }

  /**
   * Find a single session by ID
   */
  async findOne(
    userId: string,
    sessionId: string
  ): Promise<InterviewSessionDocument> {
    const session = await this.interviewSessionModel
      .findOne({
        _id: new Types.ObjectId(sessionId),
        userId: new Types.ObjectId(userId),
      });

    if (!session) {
      throw new NotFoundException(
        `Session with ID ${sessionId} not found for user ${userId}`
      );
    }

    return session as InterviewSessionDocument;
  }

  /**
   * Update a session
   */
  async update(
    userId: string,
    sessionId: string,
    updateDto: UpdateInterviewSessionDto
  ): Promise<InterviewSessionDocument> {
    const session = await this.findOne(userId, sessionId);

    // Handle status changes with timestamp updates
    const updates: any = { ...updateDto };

    if (updateDto.status === 'active' && !session.startedAt) {
      updates.startedAt = new Date();
    }

    if (updateDto.status === 'completed' && !session.completedAt) {
      updates.completedAt = new Date();
    }

    const updated = await this.interviewSessionModel
      .findByIdAndUpdate(sessionId, updates, { new: true });

    this.logger.log(`Session updated: ${sessionId}`);
    return updated as InterviewSessionDocument;
  }

  /**
   * Add a message to a session's transcript
   */
  async addMessage(
    userId: string,
    sessionId: string,
    messageDto: AddMessageDto
  ): Promise<InterviewSessionDocument> {
    const session = await this.interviewSessionModel.findOne({
      _id: new Types.ObjectId(sessionId),
      userId: new Types.ObjectId(userId),
    });

    if (!session) {
      throw new NotFoundException(
        `Session with ID ${sessionId} not found for user ${userId}`
      );
    }

    // Check if session is not completed
    if (session.status === 'completed') {
      throw new BadRequestException('Cannot add messages to a completed session');
    }

    // Create message object
    const message: Omit<Message, 'timestamp'> = {
      role: messageDto.role,
      content: messageDto.content,
    };

    // Add metadata if provided
    if (messageDto.confidence !== undefined || messageDto.feedbackType || messageDto.duration) {
      message.metadata = {};
      if (messageDto.confidence !== undefined) {
        message.metadata.confidence = messageDto.confidence;
      }
      if (messageDto.feedbackType) {
        message.metadata.feedbackType = messageDto.feedbackType;
      }
      if (messageDto.duration !== undefined) {
        message.metadata.duration = messageDto.duration;
      }
    }

    // Add message to transcript
    session.transcript.push({
      ...message,
      timestamp: new Date(),
    });

    // Update confidence history if provided
    if (messageDto.confidence !== undefined) {
      session.confidenceHistory.push(messageDto.confidence);
    }

    await session.save();

    this.logger.log(`Message added to session: ${sessionId}`);
    return session as InterviewSessionDocument;
  }

  /**
   * Update confidence score
   */
  async updateConfidence(
    userId: string,
    sessionId: string,
    confidence: number
  ): Promise<InterviewSessionDocument> {
    const session = await this.interviewSessionModel.findOne({
      _id: new Types.ObjectId(sessionId),
      userId: new Types.ObjectId(userId),
    });

    if (!session) {
      throw new NotFoundException(
        `Session with ID ${sessionId} not found for user ${userId}`
      );
    }

    session.confidenceHistory.push(confidence);
    await session.save();

    this.logger.log(`Confidence updated for session: ${sessionId}`);
    return session as InterviewSessionDocument;
  }

  /**
   * Delete a session
   */
  async remove(userId: string, sessionId: string): Promise<void> {
    const result = await this.interviewSessionModel.deleteOne({
      _id: new Types.ObjectId(sessionId),
      userId: new Types.ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException(
        `Session with ID ${sessionId} not found for user ${userId}`
      );
    }

    this.logger.log(`Session deleted: ${sessionId}`);
  }

  /**
   * Get session statistics
   */
  async getStatistics(userId: string): Promise<{
    total: number;
    active: number;
    completed: number;
    averageConfidence: number;
  }> {
    const [
      totalResult,
      activeResult,
      completedResult,
      confidenceResult,
    ] = await Promise.all([
      this.interviewSessionModel.countDocuments({
        userId: new Types.ObjectId(userId),
      }),
      this.interviewSessionModel.countDocuments({
        userId: new Types.ObjectId(userId),
        status: { $in: ['idle', 'active', 'paused'] },
      }),
      this.interviewSessionModel.countDocuments({
        userId: new Types.ObjectId(userId),
        status: 'completed',
      }),
      this.interviewSessionModel.aggregate([
        {
          $match: {
            userId: new Types.ObjectId(userId),
            status: 'completed',
          },
        },
        {
          $unwind: '$confidenceHistory',
        },
        {
          $group: {
            _id: null,
            averageConfidence: { $avg: '$confidenceHistory' },
          },
        },
      ]),
    ]);

    const averageConfidence =
      confidenceResult.length > 0
        ? Math.round(confidenceResult[0].averageConfidence * 10) / 10
        : 0;

    return {
      total: totalResult,
      active: activeResult,
      completed: completedResult,
      averageConfidence,
    };
  }
}
