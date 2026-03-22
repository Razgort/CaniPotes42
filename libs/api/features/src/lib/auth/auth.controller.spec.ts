import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import type { RegisterWithConsent } from './dto/register.dto.js';

function createMockResponse() {
  return {
    cookie: vi.fn(),
  };
}

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
  };

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
    authService = { register: vi.fn(), login: vi.fn() };
    controller = new AuthController(authService as unknown as AuthService);
  });

  // --- Registration tests ---

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

  // --- Login tests ---

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'password123' };

    const loginResult = {
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-456',
      user: {
        id: 'uuid-123',
        email: 'test@example.com',
        firstName: 'Jean',
        lastName: 'Dupont',
        avatarUrl: null,
      },
      activeClub: {
        id: 'club-1',
        name: 'Club Canin',
        role: 'OWNER',
      },
    };

    it('should return accessToken, user, and activeClub on successful login', async () => {
      authService.login.mockResolvedValue(loginResult);
      const res = createMockResponse();

      const result = await controller.login(loginDto, res as never);

      expect(result).toEqual({
        accessToken: 'access-token-123',
        user: loginResult.user,
        activeClub: loginResult.activeClub,
      });
      expect(result).not.toHaveProperty('refreshToken');
    });

    it('should set refresh token as httpOnly cookie', async () => {
      authService.login.mockResolvedValue(loginResult);
      const res = createMockResponse();

      await controller.login(loginDto, res as never);

      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-token-456',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
        }),
      );
    });

    it('should not include refreshToken in response body', async () => {
      authService.login.mockResolvedValue(loginResult);
      const res = createMockResponse();

      const result = await controller.login(loginDto, res as never);

      expect(result).not.toHaveProperty('refreshToken');
    });

    it('should propagate UnauthorizedException for invalid credentials', async () => {
      authService.login.mockRejectedValue(
        new UnauthorizedException({
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid credentials',
        })
      );
      const res = createMockResponse();

      await expect(controller.login(loginDto, res as never)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should call authService.login with the dto', async () => {
      authService.login.mockResolvedValue(loginResult);
      const res = createMockResponse();

      await controller.login(loginDto, res as never);

      expect(authService.login).toHaveBeenCalledTimes(1);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });
  });
});
