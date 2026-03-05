import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject } from '@nestjs/common';
import { Server as SocketIOServer } from 'socket.io';

import { SessionManagerService } from '../websocket/services/session-manager.service';
import { InterviewSession, InterviewSessionDocument } from '../sessions/schemas/interview-session.schema';

/**
 * Confidence score weights
 */
const CONFIDENCE_WEIGHTS = {
  speechClarity: 0.4,
  eyeContact: 0.3,
  posture: 0.2,
  fillerWords: 0.1,
} as const;

/**
 * Filler words to detect
 */
const FILLER_WORDS = [
  'um', 'uh', 'er', 'like', 'you know', 'actually', 'basically',
  'literally', 'sort of', 'kind of', 'I mean', 'okay so',
  'well', 'so', 'right', 'just', 'stuff', 'things',
];

/**
 * Confidence snapshot for storage
 */
export interface ConfidenceSnapshot {
  timestamp: Date;
  score: number;
  breakdown: {
    speechClarity: number;
    eyeContact: number;
    posture: number;
    fillerWords: number;
  };
  metadata?: {
    sessionId: string;
    frameCount: number;
    transcriptLength: number;
  };
}

/**
 * Scoring result
 */
export interface ScoringResult {
  score: number;
  breakdown: {
    speechClarity: number;
    eyeContact: number;
    posture: number;
    fillerWords: number;
  };
  suggestions: string[];
  metadata: ConfidenceSnapshot['metadata'];
}

@Injectable()
export class ConfidenceEngineService implements OnModuleDestroy {
  private readonly logger = new Logger(ConfidenceEngineService.name);
  private readonly updateInterval = 3000; // 3 seconds
  private readonly maxHistoryLength = 100;

  // Track active sessions and their last update time
  private readonly activeSessions = new Map<string, Date>();

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly winstonLogger: any,
    @InjectModel(InterviewSession.name) private readonly sessionModel: Model<InterviewSessionDocument>,
    @Optional() private readonly sessionManager?: SessionManagerService,
    @Optional() @Inject('SOCKET_IO_SERVER') private readonly ioServer?: SocketIOServer
  ) {
    this.logger.log('ConfidenceEngineService initialized');
  }

  /**
   * Calculate confidence score for a session
   */
  async calculateConfidence(sessionId: string): Promise<ScoringResult> {
    try {
      if (!this.sessionManager) {
        throw new Error('SessionManagerService is not available');
      }

      const wsSession = this.sessionManager.getSession(sessionId);

      if (!wsSession) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Get frame analyses
      const frameAnalyses = this.sessionManager.getFrameAnalyses(sessionId);
      const transcript = this.sessionManager.getTranscript(sessionId);

      // Calculate individual scores
      const speechClarity = this.calculateSpeechClarity(transcript);
      const eyeContact = this.calculateEyeContact(frameAnalyses);
      const posture = this.calculatePosture(frameAnalyses);
      const fillerWords = this.calculateFillerWords(transcript);

      // Apply filler word penalty (lower is better)
      const fillerScore = Math.max(0, 100 - fillerWords);

      // Calculate weighted overall score
      const score = Math.round(
        speechClarity * CONFIDENCE_WEIGHTS.speechClarity +
        eyeContact * CONFIDENCE_WEIGHTS.eyeContact +
        posture * CONFIDENCE_WEIGHTS.posture +
        fillerScore * CONFIDENCE_WEIGHTS.fillerWords
      );

      // Generate suggestions based on lowest scores
      const suggestions = this.generateSuggestions({
        speechClarity,
        eyeContact,
        posture,
        fillerWords: fillerScore,
      });

      const result: ScoringResult = {
        score,
        breakdown: {
          speechClarity,
          eyeContact,
          posture,
          fillerWords: fillerScore,
        },
        suggestions,
        metadata: {
          sessionId,
          frameCount: frameAnalyses.length,
          transcriptLength: transcript.length,
        },
      };

      // Log the confidence calculation
      this.winstonLogger.debug({
        message: 'Confidence calculated',
        sessionId,
        ...result,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error: any) {
      this.logger.error(`Error calculating confidence for session ${sessionId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate speech clarity score
   * Based on transcript quality, sentence length variation, and coherence
   */
  private calculateSpeechClarity(transcript: Array<{ role: string; content: string }>): number {
    if (transcript.length === 0) return 50;

    // Get only user messages
    const userMessages = transcript.filter((t) => t.role === 'user');
    if (userMessages.length === 0) return 50;

    let clarityScore = 50;

    // Check for coherent sentence structures
    const sentences = userMessages
      .map((m) => m.content)
      .join(' ')
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0);

    if (sentences.length === 0) return 30;

    // Average sentence length (ideal: 10-25 words)
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length;
    if (avgSentenceLength >= 10 && avgSentenceLength <= 25) {
      clarityScore += 20;
    } else if (avgSentenceLength > 5 && avgSentenceLength < 35) {
      clarityScore += 10;
    }

    // Vocabulary diversity (unique words / total words)
    const allWords = userMessages.map((m) => m.content.toLowerCase().split(/\W+/)).flat();
    const uniqueWords = new Set(allWords);
    const diversityRatio = allWords.length > 0 ? uniqueWords.size / allWords.length : 0;
    clarityScore += Math.round(diversityRatio * 20);

    // Message length variation (not too short, not too long)
    const avgLength = userMessages.reduce((sum, m) => sum + m.content.length, 0) / userMessages.length;
    if (avgLength >= 20 && avgLength <= 200) {
      clarityScore += 10;
    }

    return Math.min(100, Math.max(0, clarityScore));
  }

  /**
   * Calculate eye contact score from frame analyses
   */
  private calculateEyeContact(frameAnalyses: Array<{ eyeContact: number }>): number {
    if (frameAnalyses.length === 0) return 50;

    // Average eye contact from all frames
    const avgEyeContact = frameAnalyses.reduce((sum, f) => sum + f.eyeContact, 0) / frameAnalyses.length;

    // Add bonus for consistency (low variance)
    const variance = frameAnalyses.reduce((sum, f) => sum + Math.pow(f.eyeContact - avgEyeContact, 2), 0) / frameAnalyses.length;
    const consistencyBonus = Math.max(0, 20 - variance / 25); // Lower variance = higher bonus

    return Math.min(100, Math.round(avgEyeContact + consistencyBonus));
  }

  /**
   * Calculate posture score from frame analyses
   */
  private calculatePosture(frameAnalyses: Array<{ posture: number }>): number {
    if (frameAnalyses.length === 0) return 50;

    // Average posture from all frames
    const avgPosture = frameAnalyses.reduce((sum, f) => sum + f.posture, 0) / frameAnalyses.length;

    // Add bonus for consistency
    const variance = frameAnalyses.reduce((sum, f) => sum + Math.pow(f.posture - avgPosture, 2), 0) / frameAnalyses.length;
    const consistencyBonus = Math.max(0, 15 - variance / 30);

    return Math.min(100, Math.round(avgPosture + consistencyBonus));
  }

  /**
   * Calculate filler word penalty (0-100, lower is better)
   */
  private calculateFillerWords(transcript: Array<{ role: string; content: string }>): number {
    if (transcript.length === 0) return 0;

    // Get only user messages
    const userMessages = transcript.filter((t) => t.role === 'user');
    if (userMessages.length === 0) return 0;

    const text = userMessages.map((m) => m.content.toLowerCase()).join(' ');
    const words = text.split(/\s+/).filter((w) => w.length > 0);

    if (words.length === 0) return 0;

    // Count filler words
    let fillerCount = 0;
    for (const filler of FILLER_WORDS) {
      const regex = new RegExp(`\\b${filler}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        fillerCount += matches.length;
      }
    }

    // Calculate penalty (0-100, where 100 is worst)
    const fillerRatio = (fillerCount / words.length) * 100;

    // Scale: <5% fillers = 0 penalty, >30% = 100 penalty
    if (fillerRatio < 5) {
      return 0;
    } else if (fillerRatio > 30) {
      return 100;
    } else {
      return Math.round(((fillerRatio - 5) / 25) * 100);
    }
  }

  /**
   * Generate suggestions based on scores
   */
  private generateSuggestions(scores: {
    speechClarity: number;
    eyeContact: number;
    posture: number;
    fillerWords: number;
  }): string[] {
    const suggestions: string[] = [];

    // Find lowest scoring areas
    const sortedScores = Object.entries(scores).sort((a, b) => a[1] - b[1]);

    // Add suggestions for lowest scores
    for (const [name, score] of sortedScores.slice(0, 2)) {
      if (score < 70) {
        switch (name) {
          case 'speechClarity':
            suggestions.push('Try to speak more clearly and at a moderate pace');
            suggestions.push('Use complete sentences to express your thoughts');
            break;
          case 'eyeContact':
            suggestions.push('Maintain better eye contact with the camera');
            suggestions.push('Look directly at the lens when speaking');
            break;
          case 'posture':
            suggestions.push('Sit up straight and maintain good posture');
            suggestions.push('Avoid slouching or leaning too far forward/back');
            break;
          case 'fillerWords':
            suggestions.push('Reduce use of filler words (um, uh, like, you know)');
            suggestions.push('Pause briefly instead of using fillers when thinking');
            break;
        }
      }
    }

    return suggestions.slice(0, 3); // Max 3 suggestions
  }

  /**
   * Register a session for confidence tracking
   */
  registerSession(sessionId: string): void {
    this.activeSessions.set(sessionId, new Date());
    this.logger.debug(`Registered session for confidence tracking: ${sessionId}`);
  }

  /**
   * Unregister a session from confidence tracking
   */
  unregisterSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
    this.logger.debug(`Unregistered session from confidence tracking: ${sessionId}`);
  }

  /**
   * Scheduled confidence update (runs every 3 seconds)
   */
  @Cron('*/3 * * * * *')
  async updateConfidenceForActiveSessions(): Promise<void> {
    if (this.activeSessions.size === 0 || !this.sessionManager) {
      return;
    }

    this.logger.debug(`Updating confidence for ${this.activeSessions.size} active sessions`);

    for (const [sessionId, lastUpdate] of this.activeSessions.entries()) {
      try {
        // Check if session is still active
        if (!this.sessionManager.isSessionActive(sessionId)) {
          this.unregisterSession(sessionId);
          continue;
        }

        // Calculate confidence
        const result = await this.calculateConfidence(sessionId);

        // Store in MongoDB
        await this.storeConfidenceSnapshot(sessionId, {
          timestamp: new Date(),
          score: result.score,
          breakdown: result.breakdown,
          metadata: result.metadata,
        });

        // Log to console for debugging
        this.logger.debug(
          `Confidence update for ${sessionId}: ${result.score}% ` +
          `(speech: ${result.breakdown.speechClarity}, eyes: ${result.breakdown.eyeContact}, ` +
          `posture: ${result.breakdown.posture}, fillers: ${result.breakdown.fillerWords})`
        );

        // Emit WebSocket event to connected clients
        if (this.ioServer) {
          const roomId = `session:${sessionId}`;
          this.ioServer.to(roomId).emit('confidence_update', {
            sessionId,
            score: result.score,
            breakdown: result.breakdown,
            suggestions: result.suggestions,
            timestamp: new Date().toISOString(),
          });
        }

      } catch (error: any) {
        this.logger.error(`Error updating confidence for session ${sessionId}: ${error.message}`);
      }
    }
  }

  /**
   * Store confidence snapshot in MongoDB
   */
  private async storeConfidenceSnapshot(
    sessionId: string,
    snapshot: ConfidenceSnapshot
  ): Promise<void> {
    try {
      // Find session and add confidence to history using update
      const session = await this.sessionModel.findOne({ sessionId });

      if (session) {
        // Add to confidence history
        const newHistory = [...session.confidenceHistory, snapshot.score].slice(-this.maxHistoryLength);

        // Update using findOneAndUpdate to avoid type issues
        await this.sessionModel.updateOne(
          { sessionId },
          {
            $set: {
              confidenceHistory: newHistory,
              updatedAt: new Date(),
            },
          }
        );
      }
    } catch (error: any) {
      this.logger.error(`Error storing confidence snapshot: ${error.message}`);
    }
  }

  /**
   * Get confidence history for a session
   */
  async getConfidenceHistory(sessionId: string): Promise<ConfidenceSnapshot[]> {
    try {
      const session = await this.sessionModel.findOne({ sessionId });

      if (!session) {
        return [];
      }

      // Build full history from session data
      const history: ConfidenceSnapshot[] = [];
      // Note: We're storing only scores, so we'd need to expand if full history needed
      for (let i = 0; i < session.confidenceHistory.length; i++) {
        history.push({
          timestamp: new Date(Date.now() - (session.confidenceHistory.length - i) * 3000),
          score: session.confidenceHistory[i],
          breakdown: {
            speechClarity: 0,
            eyeContact: 0,
            posture: 0,
            fillerWords: 0,
          },
        });
      }

      return history;
    } catch (error: any) {
      this.logger.error(`Error getting confidence history: ${error.message}`);
      return [];
    }
  }

  /**
   * Get aggregate statistics for a session
   */
  async getSessionStatistics(sessionId: string): Promise<{
    averageConfidence: number;
    minConfidence: number;
    maxConfidence: number;
    trend: 'up' | 'down' | 'stable';
    totalSnapshots: number;
  } | null> {
    try {
      const session = await this.sessionModel.findOne({ sessionId });

      if (!session || session.confidenceHistory.length === 0) {
        return null;
      }

      const history = session.confidenceHistory;
      const averageConfidence = Math.round(
        history.reduce((sum, score) => sum + score, 0) / history.length
      );
      const minConfidence = Math.min(...history);
      const maxConfidence = Math.max(...history);

      // Calculate trend
      const recentAverage = history.slice(-10).reduce((sum, s) => sum + s, 0) / Math.min(10, history.length);
      const olderAverage = history.slice(0, -10).reduce((sum, s) => sum + s, 0) / Math.max(1, history.length - 10);
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (recentAverage > olderAverage + 5) {
        trend = 'up';
      } else if (recentAverage < olderAverage - 5) {
        trend = 'down';
      }

      return {
        averageConfidence,
        minConfidence,
        maxConfidence,
        trend,
        totalSnapshots: history.length,
      };
    } catch (error: any) {
      this.logger.error(`Error getting session statistics: ${error.message}`);
      return null;
    }
  }

  /**
   * Module destroy hook - cleanup
   */
  onModuleDestroy(): void {
    this.logger.log('Cleaning up ConfidenceEngineService...');
    this.activeSessions.clear();
  }
}
