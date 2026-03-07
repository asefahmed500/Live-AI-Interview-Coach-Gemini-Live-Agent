import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { WinstonModule } from 'nest-winston';
import { GeminiService } from './gemini.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    WinstonModule,
  ],
  providers: [GeminiService],
  exports: [GeminiService],
})
export class GeminiModule {}
