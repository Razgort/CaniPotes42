import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaService } from './prisma.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { ClubGuard } from './guards/club.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { jwtConfig } from './config/jwt.config.js';
import { HealthController } from './health/health.controller.js';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync(jwtConfig),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 10 }],
    }),
  ],
  controllers: [HealthController],
  providers: [
    PrismaService,
    JwtStrategy,
    ClubGuard,
    RolesGuard,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [PrismaService, JwtModule, PassportModule, ClubGuard, RolesGuard],
})
export class CoreModule {}
