import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
// import { GeminiModule } from '../gemini';
import { ConfidenceModule } from '../confidence';
import { LiveInterviewGateway } from './websocket.gateway';
import { SessionManagerService } from './services/session-manager.service';

@Module({
  imports: [WinstonModule, /* GeminiModule, */ ConfidenceModule],
  providers: [LiveInterviewGateway, SessionManagerService],
  exports: [LiveInterviewGateway, SessionManagerService],
})
export class WebSocketModule {}
