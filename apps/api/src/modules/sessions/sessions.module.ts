import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { InterviewSession, InterviewSessionSchema } from './schemas/interview-session.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: InterviewSession.name,
        schema: InterviewSessionSchema,
      },
    ]),
  ],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService, MongooseModule],
})
export class SessionsModule {}
