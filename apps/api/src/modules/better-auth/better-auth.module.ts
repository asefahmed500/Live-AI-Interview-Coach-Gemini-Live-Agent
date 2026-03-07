import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BetterAuthController } from './better-auth.controller';

@Module({
  imports: [ConfigModule],
  controllers: [BetterAuthController],
  providers: [],
  exports: [],
})
export class BetterAuthModule {}
