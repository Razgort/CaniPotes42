import { Body, Controller, HttpCode, HttpStatus, Post, UsePipes } from '@nestjs/common';
import { ZodValidationPipe } from '@org/api-core';
import { registerWithConsentSchema } from './dto/register.dto.js';
import type { RegisterWithConsent } from './dto/register.dto.js';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(registerWithConsentSchema))
  async register(@Body() dto: RegisterWithConsent) {
    return this.authService.register(dto);
  }
}
