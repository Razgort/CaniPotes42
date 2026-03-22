import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService, jwtConstants } from '@org/api-core';
import type { CreateClub, UpdateClub } from '@org/types';
import type { JwtPayload } from '@org/api-core';

@Injectable()
export class ClubService {
  private readonly logger = new Logger(ClubService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async createClub(dto: CreateClub, user: JwtPayload) {
    const result = await this.prisma.$transaction(async (tx) => {
      const club = await tx.club.create({
        data: {
          name: dto.name,
          federationType: dto.federation,
          logo: dto.logo ?? null,
          contactEmail: dto.contactEmail,
          description: dto.description ?? null,
        },
      });

      await tx.clubMember.create({
        data: {
          userId: user.sub,
          clubId: club.id,
          role: 'OWNER',
        },
      });

      // Auto-create the default General channel for every new club
      await tx.chatChannel.create({
        data: {
          clubId: club.id,
          name: 'General',
        },
      });

      return club;
    });

    const accessTokenPayload = {
      sub: user.sub,
      email: user.email,
      activeClubId: result.id,
      role: 'OWNER',
    };

    const accessToken = this.jwtService.sign(accessTokenPayload);

    const refreshToken = this.jwtService.sign(
      { sub: user.sub },
      {
        secret: process.env['JWT_REFRESH_SECRET'],
        expiresIn: jwtConstants.refreshTokenExpiry as any,
      },
    );

    this.logger.log(`Club created: ${result.id} by user ${user.sub}`);

    return {
      club: {
        id: result.id,
        name: result.name,
        federation: result.federationType,
        logo: result.logo,
        contactEmail: result.contactEmail,
        description: result.description,
        createdAt: result.createdAt,
      },
      accessToken,
      refreshToken,
    };
  }

  async findOne(clubId: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: {
        id: true,
        name: true,
        federationType: true,
        logo: true,
        contactEmail: true,
        description: true,
      },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    return {
      id: club.id,
      name: club.name,
      federation: club.federationType,
      logo: club.logo,
      contactEmail: club.contactEmail,
      description: club.description,
    };
  }

  async update(clubId: string, data: UpdateClub) {
    const existing = await this.prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!existing) {
      throw new NotFoundException('Club not found');
    }

    // Map schema field name to Prisma field name: federation → federationType
    const prismaData: Record<string, unknown> = {};
    if (data.name !== undefined) prismaData.name = data.name;
    if (data.federation !== undefined)
      prismaData.federationType = data.federation;
    if (data.logo !== undefined) prismaData.logo = data.logo;
    if (data.contactEmail !== undefined)
      prismaData.contactEmail = data.contactEmail;
    if (data.description !== undefined)
      prismaData.description = data.description;

    const updated = await this.prisma.club.update({
      where: { id: clubId },
      data: prismaData,
      select: {
        id: true,
        name: true,
        federationType: true,
        logo: true,
        contactEmail: true,
        description: true,
      },
    });

    this.logger.log(`Club updated: ${clubId}`);

    return {
      id: updated.id,
      name: updated.name,
      federation: updated.federationType,
      logo: updated.logo,
      contactEmail: updated.contactEmail,
      description: updated.description,
    };
  }

  async updateLogo(clubId: string, logoUrl: string) {
    const updated = await this.prisma.club.update({
      where: { id: clubId },
      data: { logo: logoUrl },
      select: { id: true, logo: true },
    });

    this.logger.log(`Club logo updated: ${clubId}`);
    return { id: updated.id, logo: updated.logo };
  }

  async getLogo(clubId: string): Promise<string | null> {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { logo: true },
    });
    return club?.logo ?? null;
  }
}
