import { IsNotEmpty, IsString, MinLength, MaxLength, IsEnum, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class AddMessageDto {
  @IsEnum(['user', 'assistant', 'system'], {
    message: 'Role must be one of: user, assistant, system',
  })
  @IsNotEmpty({ message: 'Role is required' })
  role: 'user' | 'assistant' | 'system';

  @IsString()
  @IsNotEmpty({ message: 'Content is required' })
  @MinLength(1, { message: 'Content must be at least 1 character long' })
  @MaxLength(5000, { message: 'Content must not exceed 5000 characters' })
  content: string;

  @IsNumber()
  @Min(0, { message: 'Confidence must be at least 0' })
  @Max(10, { message: 'Confidence must be at most 10' })
  @IsOptional()
  confidence?: number;

  @IsEnum(['speech', 'content', 'confidence', 'clarity'], {
    message: 'Feedback type must be one of: speech, content, confidence, clarity',
  })
  @IsOptional()
  feedbackType?: 'speech' | 'content' | 'confidence' | 'clarity';

  @IsNumber()
  @Min(0, { message: 'Duration must be at least 0' })
  @IsOptional()
  duration?: number;
}
