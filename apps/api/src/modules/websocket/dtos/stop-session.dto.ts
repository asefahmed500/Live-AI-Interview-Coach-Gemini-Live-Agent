import { IsString, IsNotEmpty, IsEnum, MinLength, MaxLength, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export enum StopReason {
  USER_COMPLETED = 'user_completed',
  USER_ABORTED = 'user_aborted',
  MAX_DURATION = 'max_duration',
  INACTIVITY = 'inactivity',
}

export class StopSessionDto {
  @IsEnum(StopReason, {
    message: 'Reason must be one of: user_completed, user_aborted, max_duration, inactivity',
  })
  reason: StopReason;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Message must not exceed 500 characters' })
  message?: string;

  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  @IsOptional()
  saveTranscript?: boolean = true;

  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  @IsOptional()
  generateReport?: boolean = true;

  @IsString()
  @IsOptional()
  sessionId?: string;
}
