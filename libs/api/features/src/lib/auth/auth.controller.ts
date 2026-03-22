import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards, UsePipes } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { ZodValidationPipe, JwtAuthGuard, CurrentUser, jwtConstants } from '@org/api-core';
import type { JwtPayload } from '@org/api-core';
import { registerWithConsentSchema } from './dto/register.dto.js';
import type { RegisterWithConsent } from './dto/register.dto.js';
import { loginSchema } from './dto/login.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import { switchClubSchema } from '@org/types';
import type { SwitchClub } from '@org/types';
import { AuthService } from './auth.service.js';
import type { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(registerWithConsentSchema))
  async register(@Body() dto: RegisterWithConsent) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);

    res.cookie(
      jwtConstants.refreshTokenCookieName,
      result.refreshToken,
      jwtConstants.refreshTokenCookieOptions,
    );

    return {
      accessToken: result.accessToken,
      user: result.user,
      activeClub: result.activeClub,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[jwtConstants.refreshTokenCookieName];

    if (!refreshToken) {
      res.status(401).json({
        statusCode: 401,
        error: 'NO_REFRESH_TOKEN',
        message: 'No refresh token provided',
      });
      return;
    }

    const result = await this.authService.refreshTokens(refreshToken);

    res.cookie(
      jwtConstants.refreshTokenCookieName,
      result.refreshToken,
      jwtConstants.refreshTokenCookieOptions,
    );

    return { accessToken: result.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: JwtPayload, @Res({ passthrough: true }) res: Response) {
    res.cookie(
      jwtConstants.refreshTokenCookieName,
      '',
      this.authService.getClearRefreshTokenCookieOptions(),
    );

    return { message: 'Logged out successfully' };
  }

  @Post('switch-club')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ZodValidationPipe(switchClubSchema))
  async switchClub(@CurrentUser() user: JwtPayload, @Body() dto: SwitchClub) {
    return this.authService.switchClub(user.sub, user.email, dto.clubId);
  }

  @Get('my-clubs')
  @UseGuards(JwtAuthGuard)
  async getMyClubs(@CurrentUser() user: JwtPayload) {
    return this.authService.getUserClubs(user.sub);
  }
}
