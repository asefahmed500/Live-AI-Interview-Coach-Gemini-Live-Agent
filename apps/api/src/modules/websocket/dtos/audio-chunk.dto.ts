import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsBase64,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum AudioCodec {
  PCM16 = 'pcm16',
  OPUS = 'opus',
  AAC = 'aac',
  MP3 = 'mp3',
}

export class AudioChunkDto {
  @IsString()
  @IsNotEmpty({ message: 'Chunk data is required' })
  @IsBase64()
  chunkData: string;

  @IsNumber()
  @Min(0, { message: 'Sequence number must be non-negative' })
  @Type(() => Number)
  sequenceNumber: number;

  @IsNumber()
  @Min(0, { message: 'Timestamp must be non-negative' })
  @Type(() => Number)
  @IsOptional()
  timestamp?: number;

  @IsEnum(AudioCodec, {
    message: 'Codec must be one of: pcm16, opus, aac, mp3',
  })
  @IsOptional()
  codec?: AudioCodec;

  @IsNumber()
  @Min(8000, { message: 'Sample rate must be at least 8000' })
  @Max(48000, { message: 'Sample rate must not exceed 48000' })
  @Type(() => Number)
  @IsOptional()
  sampleRate?: number;

  @IsString()
  @IsOptional()
  sessionId?: string;
}
