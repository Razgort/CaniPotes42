import { describe, it, expect } from 'vitest';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { AuthGuard } from '@nestjs/passport';

describe('JwtAuthGuard', () => {
  it('should be defined', () => {
    const guard = new JwtAuthGuard();
    expect(guard).toBeDefined();
  });

  it('should extend AuthGuard("jwt")', () => {
    const guard = new JwtAuthGuard();
    expect(guard).toBeInstanceOf(AuthGuard('jwt'));
  });
});
