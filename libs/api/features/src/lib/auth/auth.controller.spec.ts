import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import type { RegisterWithConsent } from './dto/register.dto.js';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: { register: ReturnType<typeof vi.fn> };

  const validDto: RegisterWithConsent = {
    email: 'test@example.com',
    password: 'password123',
    acceptPrivacyNotice: true as const,
    acceptOptionalData: false,
  };

  const registrationResult = {
    id: 'uuid-123',
    email: 'test@example.com',
    createdAt: new Date('2026-03-22T10:00:00Z'),
  };

  beforeEach(() => {
    authService = { register: vi.fn() };
    controller = new AuthController(authService as unknown as AuthService);
  });

  it('should return user data on successful registration', async () => {
    authService.register.mockResolvedValue(registrationResult);

    const result = await controller.register(validDto);

    expect(result).toEqual(registrationResult);
    expect(authService.register).toHaveBeenCalledWith(validDto);
  });

  it('should propagate ConflictException for existing email', async () => {
    authService.register.mockRejectedValue(
      new ConflictException({
        message: 'Un compte existe deja avec cette adresse email',
      })
    );

    await expect(controller.register(validDto)).rejects.toThrow(
      ConflictException
    );
  });

  it('should never include passwordHash in response', async () => {
    authService.register.mockResolvedValue(registrationResult);

    const result = await controller.register(validDto);

    expect(result).not.toHaveProperty('passwordHash');
  });

  it('should call authService.register with the dto', async () => {
    authService.register.mockResolvedValue(registrationResult);

    await controller.register(validDto);

    expect(authService.register).toHaveBeenCalledTimes(1);
    expect(authService.register).toHaveBeenCalledWith(validDto);
  });
});
