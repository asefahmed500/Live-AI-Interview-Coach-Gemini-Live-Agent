import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { GeminiService } from './gemini.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
  ],
  providers: [GeminiService],
  exports: [GeminiService],
})
export class GeminiModule {}
