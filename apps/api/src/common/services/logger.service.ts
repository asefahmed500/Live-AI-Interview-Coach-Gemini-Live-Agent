import { Injectable, LoggerService as NestLoggerService, Scope, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService implements NestLoggerService {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  log(message: any, _context?: string) {
    this.logger.info(message);
  }

  error(message: any, trace?: string, _context?: string) {
    this.logger.error(message + (trace ? ` trace: ${trace}` : ''));
  }

  warn(message: any, _context?: string) {
    this.logger.warn(message);
  }

  debug(message: any, _context?: string) {
    this.logger.debug(message);
  }

  verbose(message: any, _context?: string) {
    this.logger.verbose(message);
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  setContext(_context: string) {
    // Winston context is set per message
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */
}
