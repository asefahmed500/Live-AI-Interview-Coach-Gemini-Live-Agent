import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Model, Schema as MongooseSchema } from 'mongoose';

export interface IFeedbackDocument extends Document {
  id: string;
  sessionId: Types.ObjectId;
  userId: Types.ObjectId;
  type: 'speech' | 'content' | 'confidence' | 'clarity' | 'comprehensive';
  score: number;
  message: string;
  suggestions: string[];
  metrics: {
    speechClarity?: number;
    contentQuality?: number;
    confidenceLevel?: number;
    eyeContact?: number;
    posture?: number;
    engagement?: number;
    fillerWordCount?: number;
    pace?: number;
  };
  strengths: string[];
  improvements: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type FeedbackDocument = IFeedbackDocument;

// Interface for static methods
export interface FeedbackModel extends Model<FeedbackDocument> {
  findBySession(sessionId: Types.ObjectId): Promise<FeedbackDocument[]>;
  findComprehensiveBySession(sessionId: Types.ObjectId): Promise<FeedbackDocument | null>;
  getAverageScoresByUser(userId: Types.ObjectId): Promise<any[]>;
}

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc: any, ret: Record<string, unknown>) => {
      ret.id = (ret._id as Types.ObjectId | undefined)?.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
  toObject: {
    virtuals: true,
    transform: (_doc: any, ret: Record<string, unknown>) => {
      ret.id = (ret._id as Types.ObjectId | undefined)?.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Feedback {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
    index: true,
  })
  sessionId: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['speech', 'content', 'confidence', 'clarity', 'comprehensive'],
    required: true,
  })
  type: 'speech' | 'content' | 'confidence' | 'clarity' | 'comprehensive';

  @Prop({
    type: Number,
    required: true,
    min: 0,
    max: 10,
  })
  score: number;

  @Prop({
    type: String,
    required: true,
    minlength: 10,
    maxlength: 2000,
  })
  message: string;

  @Prop({
    type: [String],
    default: [],
  })
  suggestions: string[];

  @Prop({
    type: Object,
    default: {},
  })
  metrics: {
    speechClarity?: number;
    contentQuality?: number;
    confidenceLevel?: number;
    eyeContact?: number;
    posture?: number;
    engagement?: number;
    fillerWordCount?: number;
    pace?: number;
  };

  @Prop({
    type: Object,
    default: {},
  })
  strengths: string[];

  @Prop({
    type: Object,
    default: {},
  })
  improvements: string[];

  readonly id: string;
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);

// Indexes
FeedbackSchema.index({ sessionId: 1, type: 1 });
FeedbackSchema.index({ userId: 1, createdAt: -1 });
FeedbackSchema.index({ type: 1, score: -1 });

// Static method to find feedback by session
FeedbackSchema.statics.findBySession = function (
  this: any,
  sessionId: Types.ObjectId
) {
  return this.find({ sessionId }).sort({ createdAt: 1 });
};

// Static method to find comprehensive feedback for session
FeedbackSchema.statics.findComprehensiveBySession = function (
  this: any,
  sessionId: Types.ObjectId
) {
  return this.findOne({ sessionId, type: 'comprehensive' });
};

// Static method to calculate average scores by user
FeedbackSchema.statics.getAverageScoresByUser = function (
  this: any,
  userId: Types.ObjectId
) {
  return this.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: '$type',
        averageScore: { $avg: '$score' },
        count: { $sum: 1 },
      },
    },
  ]);
};
