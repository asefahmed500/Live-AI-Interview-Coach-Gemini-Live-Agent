import {
  IsString,
  IsNumber,
  IsEnum,
  IsNotEmpty,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsArray,
  IsOptional,
  IsObject,
} from 'class-validator';

export class CreateFeedbackDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsEnum(['speech', 'content', 'confidence', 'clarity', 'comprehensive'])
  @IsNotEmpty()
  type: 'speech' | 'content' | 'confidence' | 'clarity' | 'comprehensive';

  @IsNumber()
  @Min(0)
  @Max(10)
  score: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  message: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  suggestions?: string[];

  @IsObject()
  @IsOptional()
  metrics?: Record<string, number>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  strengths?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  improvements?: string[];
}
