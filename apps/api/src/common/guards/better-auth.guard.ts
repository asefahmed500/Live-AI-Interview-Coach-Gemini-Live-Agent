import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { auth } from '../../lib/better-auth';

/**
 * Better Auth Guard
 *
 * This guard validates Better Auth session tokens for WebSocket connections.
 * It extracts the session token from the handshake and validates it.
 */
@Injectable()
export class BetterAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const handshake = client.handshake;

    // Extract session token from handshake
    const sessionToken = this.extractSessionToken(handshake);

    if (!sessionToken) {
      throw new UnauthorizedException('No session token provided');
    }

    try {
      // Validate session with Better Auth
      // Note: This is a simplified implementation
      // In production, you'd use better-auth's session validation
      const isValid = await this.validateSession(sessionToken);

      if (!isValid) {
        throw new UnauthorizedException('Invalid or expired session');
      }

      // Attach user info to socket for later use
      client.data.user = await this.getUserFromSession(sessionToken);

      return true;
    } catch (error) {
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private extractSessionToken(handshake: any): string | null {
    // Try to get token from auth object
    if (handshake.auth?.sessionToken) {
      return handshake.auth.sessionToken;
    }

    // Try to get token from headers
    if (handshake.headers?.cookie) {
      const cookies = this.parseCookies(handshake.headers.cookie);
      return cookies['laic_session'] || cookies['session_token'] || null;
    }

    // Try to get token from query string
    if (handshake.query?.sessionToken) {
      return handshake.query.sessionToken;
    }

    return null;
  }

  private parseCookies(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    cookieHeader.split(';').forEach((cookie) => {
      const [name, value] = cookie.trim().split('=');
      cookies[name] = decodeURIComponent(value);
    });
    return cookies;
  }

  private async validateSession(token: string): Promise<boolean> {
    // TODO: Implement actual Better Auth session validation
    // This would typically call better-auth's session validation endpoint
    // For now, return true for non-empty tokens
    return !!token;
  }

  private async getUserFromSession(token: string): Promise<any> {
    // TODO: Implement actual user fetching from Better Auth
    // This would typically call better-auth's get-session endpoint
    return { id: 'user-id', email: 'user@example.com' };
  }
}

/**
 * Public decorator - marks routes that don't require authentication
 */
export const Public = () => {
  return (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) => {
    // This is a placeholder - in NestJS, you'd use a custom decorator
    // to mark routes as public (no auth required)
  };
};
