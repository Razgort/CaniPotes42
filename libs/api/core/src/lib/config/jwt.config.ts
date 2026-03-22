import { JwtModuleAsyncOptions } from '@nestjs/jwt';

export const jwtConfig: JwtModuleAsyncOptions = {
  useFactory: () => ({
    secret: process.env['JWT_SECRET'],
    signOptions: { expiresIn: '15m' },
  }),
};

export const jwtConstants = {
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  refreshTokenCookieName: 'refresh_token',
  refreshTokenCookieOptions: {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  },
};
