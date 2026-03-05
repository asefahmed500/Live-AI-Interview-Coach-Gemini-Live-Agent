import { Module, Global } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';

import { ConfidenceEngineService } from './confidence-engine.service';
import { ConfidenceController } from './confidence.controller';
import { InterviewSessionSchema } from '../sessions/schemas/interview-session.schema';

@Global()
@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([{ name: 'InterviewSession', schema: InterviewSessionSchema }]),
  ],
  controllers: [ConfidenceController],
  providers: [ConfidenceEngineService],
  exports: [ConfidenceEngineService],
})
export class ConfidenceModule {}
