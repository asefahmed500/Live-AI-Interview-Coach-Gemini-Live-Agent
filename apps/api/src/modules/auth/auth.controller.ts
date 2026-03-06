import { Controller, Post, Body, Get, Put, UseGuards, Request, Delete } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
import { RegisterDto } from './dtos/register.dto';
import { AuthGuard, Public } from '../../common/guards/auth.guard';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user account
   * Rate limited to 3 requests per hour
   */
  @Public()
  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 requests per hour
  async register(@Body() registerDto: RegisterDto) {
    const result = await this.authService.register(registerDto);
    // Return 'token' instead of 'accessToken' for frontend compatibility
    return {
      token: result.accessToken,
      user: result.user,
    };
  }

  /**
   * Login with email and password
   * Rate limited to 5 requests per minute
   */
  @Public()
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);
    // Return 'token' instead of 'accessToken' for frontend compatibility
    return {
      token: result.accessToken,
      user: result.user,
    };
  }

  /**
   * Get current user profile
   * Requires authentication
   */
  @Get('profile')
  @UseGuards(AuthGuard)
  async getProfile(@Request() req: any) {
    return this.authService.getUserById(req.userId);
  }

  /**
   * Update user profile
   * Requires authentication
   */
  @Put('profile')
  @UseGuards(AuthGuard)
  async updateProfile(@Request() req: any, @Body() updateProfileDto: UpdateProfileDto) {
    return this.authService.updateProfile(req.userId, updateProfileDto);
  }

  /**
   * Change password
   * Requires authentication
   */
  @Post('change-password')
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 requests per hour
  async changePassword(@Request() req: any, @Body() changePasswordDto: ChangePasswordDto) {
    return this.authService.changePassword(
      req.userId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword
    );
  }

  /**
   * Deactivate user account
   * Requires authentication
   */
  @Delete('account')
  @UseGuards(AuthGuard)
  async deactivateAccount(@Request() req: any) {
    return this.authService.deactivateAccount(req.userId);
  }

  /**
   * Verify token validity
   * Requires authentication
   */
  @Get('verify')
  @UseGuards(AuthGuard)
  async verify(@Request() req: any) {
    return {
      valid: true,
      user: {
        id: req.user.sub,
        email: req.userEmail,
      },
    };
  }
}
