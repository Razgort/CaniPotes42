import { Body, Controller, HttpCode, HttpStatus, Post, Res, UsePipes } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ZodValidationPipe } from '@org/api-core';
import { jwtConstants } from '@org/api-core';
import { registerWithConsentSchema } from './dto/register.dto.js';
import type { RegisterWithConsent } from './dto/register.dto.js';
import { loginSchema } from './dto/login.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import { AuthService } from './auth.service.js';
import type { Response } from 'express';

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
}
