import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { auth } from '../../lib/better-auth';

@Injectable()
export class BetterAuthService implements OnModuleInit {
  private readonly logger = new Logger(BetterAuthService.name);

  constructor(
    @InjectModel('user') private readonly userModel: Model<any>,
    @InjectModel('session') private readonly sessionModel: Model<any>,
  ) { }

  async onModuleInit() {
    await this.initialize();
  }

  async initialize() {
    this.logger.log('Better Auth service initialized');
  }

  getAuth() {
    return auth;
  }
}
