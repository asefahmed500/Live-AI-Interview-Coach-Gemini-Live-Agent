import { IsNotEmpty, IsString, IsOptional, MinLength, MaxLength, IsEnum } from 'class-validator';

export class CreateInterviewSessionDto {
  @IsString()
  @IsNotEmpty({ message: 'Job description is required' })
  @MinLength(10, { message: 'Job description must be at least 10 characters long' })
  @MaxLength(500, { message: 'Job description must not exceed 500 characters' })
  jobDescription: string;

  @IsEnum(['idle', 'active'], {
    message: 'Initial status must be either idle or active',
  })
  @IsOptional()
  status?: 'idle' | 'active';

  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: 'Initial message must not exceed 1000 characters' })
  initialMessage?: string;
}
