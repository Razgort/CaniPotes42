import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@org/api-core';
import { jwtConstants } from '@org/api-core';
import type { JwtPayload } from '@org/api-core';
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

    // If invitation token provided, validate it before creating user
    let invitation: { id: string; clubId: string; expiresAt: Date; acceptedAt: Date | null } | null = null;
    if (dto.invitationToken) {
      invitation = await this.prisma.invitation.findUnique({
        where: { token: dto.invitationToken },
      });

      if (!invitation || invitation.acceptedAt || new Date() > invitation.expiresAt) {
        throw new BadRequestException('Invitation invalide ou expirée');
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
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

      // If invitation, create club membership and mark accepted
      let clubMembership: { clubId: string; role: string } | null = null;
      if (invitation) {
        await tx.clubMember.create({
          data: {
            userId: created.id,
            clubId: invitation.clubId,
            role: 'MEMBER',
          },
        });

        await tx.invitation.update({
          where: { id: invitation.id },
          data: { acceptedAt: now },
        });

        clubMembership = { clubId: invitation.clubId, role: 'MEMBER' };
      }

      return { user: created, clubMembership };
    });

    this.logger.log(`User registered: ${result.user.id}`);

    // If invitation-based registration, issue JWT with activeClubId
    if (result.clubMembership) {
      const club = await this.prisma.club.findUnique({
        where: { id: result.clubMembership.clubId },
        select: { id: true, name: true },
      });

      const accessToken = this.jwtService.sign({
        sub: result.user.id,
        email: result.user.email,
        activeClubId: result.clubMembership.clubId,
        role: 'MEMBER',
      });

      const refreshToken = this.jwtService.sign(
        { sub: result.user.id },
        {
          secret: process.env['JWT_REFRESH_SECRET'],
          expiresIn: jwtConstants.refreshTokenExpiry as any,
        },
      );

      return {
        id: result.user.id,
        email: result.user.email,
        createdAt: result.user.createdAt,
        accessToken,
        refreshToken,
        activeClub: club ? { id: club.id, name: club.name, role: 'MEMBER' } : null,
      };
    }

    return {
      id: result.user.id,
      email: result.user.email,
      createdAt: result.user.createdAt,
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
        expiresIn: jwtConstants.refreshTokenExpiry as any,
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

  async refreshTokens(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: process.env['JWT_REFRESH_SECRET'],
      });
    } catch {
      throw new UnauthorizedException({
        error: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException({
        error: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    // Re-read current club membership from DB (do NOT copy from old token)
    const memberships = await this.prisma.clubMember.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    let activeClubId: string | null = null;
    let role: string | null = null;

    if (memberships.length > 0) {
      activeClubId = memberships[0].clubId;
      role = memberships[0].role;
    }

    const accessTokenPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      activeClubId: activeClubId as string,
      role: role as JwtPayload['role'],
    };

    const newAccessToken = this.jwtService.sign(accessTokenPayload);

    const newRefreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: process.env['JWT_REFRESH_SECRET'],
        expiresIn: jwtConstants.refreshTokenExpiry as any,
      },
    );

    this.logger.log(`Tokens refreshed for user: ${user.id}`);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async switchClub(userId: string, email: string, clubId: string) {
    const membership = await this.prisma.clubMember.findFirst({
      where: {
        userId,
        clubId,
      },
      include: {
        club: {
          select: { id: true, name: true, logo: true, federationType: true },
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this club');
    }

    const accessToken = this.jwtService.sign({
      sub: userId,
      email,
      activeClubId: clubId,
      role: membership.role,
    });

    this.logger.log(`User ${userId} switched to club ${clubId}`);

    return {
      accessToken,
      activeClub: {
        id: membership.club.id,
        name: membership.club.name,
        logo: membership.club.logo,
        federationType: membership.club.federationType,
      },
      role: membership.role,
    };
  }

  async getUserClubs(userId: string) {
    const memberships = await this.prisma.clubMember.findMany({
      where: { userId },
      include: {
        club: {
          select: { id: true, name: true, logo: true, federationType: true },
        },
      },
      orderBy: { club: { name: 'asc' } },
    });

    return memberships.map((m) => ({
      clubId: m.club.id,
      name: m.club.name,
      logo: m.club.logo,
      federationType: m.club.federationType,
      role: m.role,
    }));
  }

  getClearRefreshTokenCookieOptions() {
    return {
      ...jwtConstants.refreshTokenCookieOptions,
      maxAge: 0,
    };
  }
}
