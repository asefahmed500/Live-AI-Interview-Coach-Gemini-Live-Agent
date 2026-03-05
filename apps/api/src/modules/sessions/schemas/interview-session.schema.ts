import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type InterviewSessionDocument = InterviewSession & Document;

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    confidence?: number;
    feedbackType?: 'speech' | 'content' | 'confidence' | 'clarity';
    duration?: number;
  };
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
export class InterviewSession {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  })
  jobDescription: string;

  @Prop({
    type: [
      {
        role: {
          type: String,
          enum: ['user', 'assistant', 'system'],
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        metadata: {
          confidence: Number,
          feedbackType: {
            type: String,
            enum: ['speech', 'content', 'confidence', 'clarity'],
          },
          duration: Number,
        },
      },
    ],
    default: [],
  })
  transcript: Message[];

  @Prop({
    type: [Number],
    default: [],
    validate: {
      validator: function (v: number[]) {
        return v.every((score) => score >= 0 && score <= 10);
      },
      message: 'Confidence scores must be between 0 and 10',
    },
  })
  confidenceHistory: number[];

  @Prop({
    type: String,
    enum: ['idle', 'active', 'paused', 'completed'],
    default: 'idle',
    index: true,
  })
  status: 'idle' | 'active' | 'paused' | 'completed';

  @Prop({
    type: Date,
    default: null,
  })
  startedAt: Date | null;

  @Prop({
    type: Date,
    default: null,
  })
  completedAt: Date | null;

  @Prop({
    type: Number,
    min: 0,
    max: 10,
    default: null,
  })
  averageConfidence: number | null;

  @Prop({
    type: Object,
    default: {},
  })
  metadata: Record<string, unknown>;

  readonly id: string;
}

export const InterviewSessionSchema = SchemaFactory.createForClass(InterviewSession);

// Compound indexes for common queries
InterviewSessionSchema.index({ userId: 1, status: 1, createdAt: -1 });
InterviewSessionSchema.index({ userId: 1, createdAt: -1 });
InterviewSessionSchema.index({ status: 1, createdAt: -1 });

// Text index for job description search (transcript.content is an array field, causing issues)
InterviewSessionSchema.index({ jobDescription: 'text' });

// Pre-save middleware to update timestamps based on status
InterviewSessionSchema.pre('save', function (next) {
  const session = this as InterviewSessionDocument;

  if (session.isModified('status')) {
    if (session.status === 'active' && !session.startedAt) {
      session.startedAt = new Date();
    }
    if (session.status === 'completed' && !session.completedAt) {
      session.completedAt = new Date();
    }
  }

  next();
});

// Method to add message and update confidence
InterviewSessionSchema.methods.addMessage = function(
  this: InterviewSessionDocument,
  message: Omit<Message, 'timestamp'>
) {
  this.transcript.push({
    ...message,
    timestamp: new Date(),
  });

  if (message.metadata?.confidence !== undefined) {
    this.confidenceHistory.push(message.metadata.confidence);
  }

  return this.save();
};

// Static method for active sessions
InterviewSessionSchema.statics.findActiveByUser = function(
  this: any,
  userId: Types.ObjectId
) {
  return this.find({ userId, status: { $in: ['idle', 'active', 'paused'] } }).sort({
    createdAt: -1,
  });
};

// Static method for completed sessions
InterviewSessionSchema.statics.findCompletedByUser = function(
  this: any,
  userId: Types.ObjectId,
  limit = 10
) {
  return this
    .find({ userId, status: 'completed' })
    .sort({ completedAt: -1 })
    .limit(limit);
};
