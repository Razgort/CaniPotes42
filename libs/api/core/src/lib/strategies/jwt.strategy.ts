import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  email: string;
  activeClubId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env['JWT_SECRET'] ?? 'fallback-dev-secret',
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    this.logger.debug(`JWT validated for user ${payload.sub}`);
    return payload;
  }
}
