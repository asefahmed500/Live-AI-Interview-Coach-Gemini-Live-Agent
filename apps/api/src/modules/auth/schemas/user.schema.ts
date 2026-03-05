import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UserDocument extends Document {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'user' | 'admin';
  isActive: boolean;
  lastLoginAt: Date | null;
  preferences: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  updateLastLogin(): Promise<UserDocument>;
}

// Interface for static methods
export interface UserModel extends Model<UserDocument> {
  findByEmailWithPassword(email: string): Promise<UserDocument | null>;
  emailExists(email: string): Promise<boolean>;
}

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc: unknown, ret: Record<string, unknown>) => {
      ret.id = (ret._id as string | { toString: () => string })?.toString?.() || ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.passwordHash;
      return ret;
    },
  },
  toObject: {
    virtuals: true,
    transform: (_doc: unknown, ret: Record<string, unknown>) => {
      ret.id = (ret._id as string | { toString: () => string })?.toString?.() || ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.passwordHash;
      return ret;
    },
  },
})
export class User {
  @Prop({
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  email: string;

  @Prop({
    type: String,
    required: true,
    select: false,
  })
  passwordHash: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
  })
  name: string;

  @Prop({
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  })
  role: 'user' | 'admin';

  @Prop({
    type: Boolean,
    default: true,
  })
  isActive: boolean;

  @Prop({
    type: Date,
    default: null,
  })
  lastLoginAt: Date | null;

  @Prop({
    type: Object,
    default: {},
  })
  preferences: Record<string, unknown>;

  readonly id: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ isActive: 1, createdAt: -1 });

// Pre-save middleware to hash password
UserSchema.pre('save', async function (next) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = this as any;

  if (!user.isModified('passwordHash')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
    next();
  } catch (error: unknown) {
    next(error as Error);
  }
});

// Method to compare password
// eslint-disable-next-line @typescript-eslint/no-explicit-any
UserSchema.methods.comparePassword = async function (this: any, candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Method to update last login
// eslint-disable-next-line @typescript-eslint/no-explicit-any
UserSchema.methods.updateLastLogin = async function (this: any): Promise<any> {
  this.lastLoginAt = new Date();
  return this.save();
};

// Static method to find by email with password
// eslint-disable-next-line @typescript-eslint/no-explicit-any
UserSchema.statics.findByEmailWithPassword = function (this: any, email: string) {
  return this.findOne({ email, isActive: true }).select('+passwordHash');
};

// Static method to check if email exists
// eslint-disable-next-line @typescript-eslint/no-explicit-any
UserSchema.statics.emailExists = async function (this: any, email: string): Promise<boolean> {
  const count = await this.countDocuments({ email });
  return count > 0;
};
