import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@org/api-core';
import { jwtConstants } from '@org/api-core';
import * as bcrypt from 'bcrypt';
import type { RegisterWithConsent } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterWithConsent) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException({
        message: 'Un compte existe deja avec cette adresse email',
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const now = new Date();

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          firstName: '',
          lastName: '',
        },
      });

      await tx.consent.createMany({
        data: [
          {
            userId: created.id,
            consentType: 'privacy_notice',
            granted: true,
            grantedAt: now,
          },
          {
            userId: created.id,
            consentType: 'optional_data',
            granted: dto.acceptOptionalData,
            grantedAt: now,
          },
        ],
      });

      return created;
    });

    this.logger.log(`User registered: ${user.id}`);

    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
      });
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
      });
    }

    const memberships = await this.prisma.clubMember.findMany({
      where: { userId: user.id },
      include: { club: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    let activeClubId: string | null = null;
    let role: string | null = null;
    let activeClub: { id: string; name: string; role: string } | null = null;

    if (memberships.length === 1) {
      activeClubId = memberships[0].clubId;
      role = memberships[0].role;
      activeClub = {
        id: memberships[0].club.id,
        name: memberships[0].club.name,
        role: memberships[0].role,
      };
    } else if (memberships.length > 1) {
      const firstMembership = memberships[0];
      activeClubId = firstMembership.clubId;
      role = firstMembership.role;
      activeClub = {
        id: firstMembership.club.id,
        name: firstMembership.club.name,
        role: firstMembership.role,
      };
    }

    const accessTokenPayload = {
      sub: user.id,
      email: user.email,
      activeClubId,
      role,
    };

    const accessToken = this.jwtService.sign(accessTokenPayload);

    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: process.env['JWT_REFRESH_SECRET'],
        expiresIn: jwtConstants.refreshTokenExpiry,
      },
    );

    this.logger.log(`User logged in: ${user.id}`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
      },
      activeClub,
    };
  }
}
