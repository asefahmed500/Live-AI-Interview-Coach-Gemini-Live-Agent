import { IsString, IsNotEmpty, IsNumber, Min, Max, IsOptional, IsBoolean, IsArray, IsEnum, IsIn, Matches } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum Emotion {
  NEUTRAL = 'neutral',
  HAPPY = 'happy',
  SAD = 'sad',
  ANGRY = 'angry',
  FEAR = 'fear',
  SURPRISE = 'surprise',
  DISGUST = 'disgust',
}

export enum Engagement {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export class FaceData {
  @IsNumber()
  @Min(0, { message: 'Confidence must be between 0 and 1' })
  @Max(1, { message: 'Confidence must be between 0 and 1' })
  confidence: number;

  @IsEnum(Emotion, {
    message: 'Emotion must be valid',
  })
  emotion: Emotion;

  @IsNumber()
  @Min(0, { message: 'Attention score must be between 0 and 1' })
  @Max(1, { message: 'Attention score must be between 0 and 1' })
  attention: number;
}

export class FrameAnalysisDto {
  @IsString()
  @IsNotEmpty({ message: 'sessionId is required' })
  sessionId: string;

  @IsString()
  @IsNotEmpty({ message: 'Frame data is required' })
  @Matches(/^[A-Za-z0-9+/]+=*$/, { message: 'Frame data must be base64 encoded' })
  frameData: string;

  @IsNumber()
  @Min(0, { message: 'Timestamp must be non-negative' })
  @Type(() => Number)
  @IsOptional()
  timestamp?: number;

  @IsNumber()
  @Min(0, { message: 'Frame number must be non-negative' })
  @Type(() => Number)
  @IsOptional()
  frameNumber?: number;

  @IsString()
  @IsIn(['jpeg', 'png', 'webp'])
  @IsOptional()
  format?: 'jpeg' | 'png' | 'webp';

  @IsNumber()
  @Min(1)
  @Max(4096)
  @Type(() => Number)
  @IsOptional()
  width?: number;

  @IsNumber()
  @Min(1)
  @Max(4096)
  @Type(() => Number)
  @IsOptional()
  height?: number;

  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  @IsOptional()
  faceDetected?: boolean;

  @IsOptional()
  faceData?: FaceData;

  @IsEnum(Engagement, {
    message: 'Engagement must be one of: high, medium, low',
  })
  @IsOptional()
  engagement?: Engagement;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  detectedObjects?: string[];
}
