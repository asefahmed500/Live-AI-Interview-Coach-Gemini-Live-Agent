import { IsString, IsNotEmpty, IsOptional, IsEnum, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export enum InterviewMode {
  TECHNICAL = 'technical',
  BEHAVIORAL = 'behavioral',
  MIXED = 'mixed',
}

export enum InterviewDifficulty {
  JUNIOR = 'junior',
  MID = 'mid',
  SENIOR = 'senior',
  LEAD = 'lead',
}

export enum InterviewPersonality {
  FRIENDLY = 'friendly',
  AGGRESSIVE = 'aggressive',
  VC = 'vc',
}

export class StartSessionDto {
  @IsString()
  @IsNotEmpty({ message: 'Job description is required' })
  @MinLength(10, { message: 'Job description must be at least 10 characters' })
  @MaxLength(1000, { message: 'Job description must not exceed 1000 characters' })
  @Transform(({ value }) => value?.trim())
  jobDescription: string;

  @IsEnum(InterviewMode, {
    message: 'Mode must be one of: technical, behavioral, mixed',
  })
  @IsOptional()
  mode?: InterviewMode;

  @IsEnum(InterviewDifficulty, {
    message: 'Difficulty must be one of: junior, mid, senior, lead',
  })
  @IsOptional()
  difficulty?: InterviewDifficulty;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Initial message must not exceed 500 characters' })
  initialMessage?: string;

  @IsEnum(InterviewPersonality, {
    message: 'Personality must be one of: friendly, aggressive, vc',
  })
  @IsOptional()
  personality?: InterviewPersonality;

  @IsString()
  @IsOptional()
  sessionId?: string;
}
