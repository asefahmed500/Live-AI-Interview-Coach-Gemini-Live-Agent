import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '../types/jwt.types';

/**
 * Authentication Guard - Validates JWT tokens
 *
 * Usage:
 * @UseGuards(AuthGuard)
 * @Controller() or @Get() etc.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access token is missing');
    }

    try {
      const secret = this.configService.get<string>('JWT_SECRET', 'default-secret-change-in-production');
      const payload: JwtPayload = await this.jwtService.verifyAsync(token, { secret });

      // Attach user payload to request
      request['user'] = payload;
      request['userId'] = payload.sub;
      request['userEmail'] = payload.email;

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}

/**
 * Public Route Decorator
 * Mark routes as public to bypass authentication
 *
 * Usage:
 * @Public()
 * @Post('register')
 * async register() { ... }
 */
export const Public = () => (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
  Reflect.defineMetadata('isPublic', true, propertyKey ? descriptor : target);
};
