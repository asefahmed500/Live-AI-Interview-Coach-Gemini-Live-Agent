import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { toBoolean } from '../../../common/utils/to-boolean.util';

export class QuerySessionsDto {
  @IsEnum(['idle', 'active', 'paused', 'completed'], {
    message: 'Status must be one of: idle, active, paused, completed',
  })
  @IsOptional()
  status?: 'idle' | 'active' | 'paused' | 'completed';

  @IsString()
  @IsOptional()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @IsOptional()
  @Type(() => toBoolean)
  includeCompleted?: boolean = true;
}
