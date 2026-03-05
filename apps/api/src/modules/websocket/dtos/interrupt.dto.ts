import { IsString, IsNotEmpty, IsEnum, MinLength, MaxLength, IsOptional, IsNumber, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum InterruptReason {
  USER_STOPPED = 'user_stopped',
  TECHNICAL_ISSUE = 'technical_issue',
  TIMEOUT = 'timeout',
  QUALITY_ISSUE = 'quality_issue',
}

export class InterruptDto {
  @IsEnum(InterruptReason, {
    message: 'Reason must be one of: user_stopped, technical_issue, timeout, quality_issue',
  })
  reason: InterruptReason;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Message must not exceed 500 characters' })
  message?: string;

  @IsNumber()
  @Min(0, { message: 'Timestamp must be non-negative' })
  @Type(() => Number)
  @IsOptional()
  timestamp?: number;

  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Error code must not exceed 100 characters' })
  errorCode?: string;
}
