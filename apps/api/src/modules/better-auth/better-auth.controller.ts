import { Controller, Req, Res, Post, Get, HttpException, HttpStatus, Body } from '@nestjs/common';
import { Request, Response } from 'express';
import { SignUpDto, SignInDto } from './dtos';

/**
 * Better Auth Controller
 *
 * This controller handles all Better Auth endpoints.
 * Endpoints are mounted at /api/auth/*
 */
@Controller('auth')
export class BetterAuthController {
  /**
   * Sign up with email and password
   */
  @Post('sign-up/email')
  async signUpEmail(@Body() signUpDto: SignUpDto, @Res() res: Response) {
    try {
      const { email, password, name } = signUpDto;

      // For now, return a success response with mock data
      // Better Auth integration will be completed after testing
      return res.json({
        success: true,
        user: {
          id: `user_${Date.now()}`,
          email,
          name,
          role: 'user',
        },
        session: {
          token: `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        message: 'Registration successful (mock - Better Auth pending)',
      });
    } catch (error: any) {
      console.error('[Auth] Sign up error:', error);
      throw new HttpException(
        error.message || 'Registration failed',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Sign in with email and password
   */
  @Post('sign-in/email')
  async signInEmail(@Body() signInDto: SignInDto, @Res() res: Response) {
    try {
      const { email, password } = signInDto;

      // For now, return a success response with mock data
      return res.json({
        success: true,
        user: {
          id: `user_${Date.now()}`,
          email,
          name: 'Demo User',
          role: 'user',
        },
        session: {
          token: `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        message: 'Sign in successful (mock - Better Auth pending)',
      });
    } catch (error: any) {
      console.error('[Auth] Sign in error:', error);
      throw new HttpException(
        error.message || 'Sign in failed',
        HttpStatus.UNAUTHORIZED
      );
    }
  }

  /**
   * Sign out
   */
  @Post('sign-out')
  async signOut(@Res() res: Response) {
    return res.json({
      success: true,
      message: 'Signed out successfully',
    });
  }

  /**
   * Get current session
   */
  @Get('get-session')
  async getSession(@Req() req: Request) {
    // Check for session token in cookie or header
    const sessionToken = this.extractSessionToken(req);
    
    if (!sessionToken) {
      return {
        user: null,
        session: null,
      };
    }

    // Mock session response
    return {
      user: {
        id: 'user_123',
        email: 'demo@example.com',
        name: 'Demo User',
        role: 'user',
      },
      session: {
        token: sessionToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    };
  }

  /**
   * Health check for Better Auth
   */
  @Get('health')
  async healthCheck() {
    return {
      status: 'ok',
      service: 'better-auth',
      timestamp: new Date().toISOString(),
      endpoints: [
        'POST /api/auth/sign-up/email - Register with email/password',
        'POST /api/auth/sign-in/email - Sign in with email/password',
        'POST /api/auth/sign-out - Sign out',
        'GET /api/auth/get-session - Get current session',
      ],
    };
  }

  /**
   * Extract session token from request
   */
  private extractSessionToken(req: Request): string | null {
    // Try cookie
    if (req.headers.cookie) {
      const cookies = req.headers.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'laic_session_token') {
          return value;
        }
      }
    }

    // Try authorization header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }
}
