import { IsString, MinLength, MaxLength, IsOptional, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name?: string;

  @IsOptional()
  @IsObject({ message: 'Preferences must be an object' })
  preferences?: Record<string, unknown>;
}
