import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsEnum,
  IsArray,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateInterviewSessionDto } from './create-interview-session.dto';

export class UpdateInterviewSessionDto extends PartialType(
  OmitType(CreateInterviewSessionDto, ['initialMessage', 'status'] as const)
) {
  @IsEnum(['idle', 'active', 'paused', 'completed'], {
    message: 'Status must be one of: idle, active, paused, completed',
  })
  @IsOptional()
  status?: 'idle' | 'active' | 'paused' | 'completed';

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Job description must not exceed 500 characters' })
  jobDescription?: string;

  @IsArray()
  @IsOptional()
  transcript?: unknown[];

  @IsArray()
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  @Max(10, { each: true })
  @IsOptional()
  confidenceHistory?: number[];

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  metadata?: Record<string, unknown>;
}
