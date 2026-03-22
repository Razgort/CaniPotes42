import {
  ConflictException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@org/api-core';
import { MailService } from '@org/api-core';
import type { CreateInvitationDto } from './dto/create-invitation.dto.js';

const INVITATION_EXPIRY_DAYS = 7;

@Injectable()
export class InviteService {
  private readonly logger = new Logger(InviteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async createInvitations(clubId: string, dto: CreateInvitationDto) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { name: true, logo: true },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    const duplicates: string[] = [];
    let sent = 0;

    for (const email of dto.emails) {
      const normalizedEmail = email.toLowerCase().trim();

      // Check for existing active invitation
      const existing = await this.prisma.invitation.findUnique({
        where: { clubId_email: { clubId, email: normalizedEmail } },
      });

      if (existing && !existing.acceptedAt) {
        duplicates.push(normalizedEmail);
        continue;
      }

      // If previously accepted, also skip
      if (existing?.acceptedAt) {
        duplicates.push(normalizedEmail);
        continue;
      }

      const invitation = await this.prisma.invitation.create({
        data: {
          clubId,
          email: normalizedEmail,
          expiresAt,
        },
      });

      try {
        await this.mailService.sendInvitation({
          to: normalizedEmail,
          clubName: club.name,
          clubLogo: club.logo,
          inviteToken: invitation.token,
          frontendUrl: process.env['FRONTEND_URL'] ?? 'http://localhost:4200',
        });
        sent++;
      } catch (error) {
        this.logger.error(
          `Failed to send invitation to ${normalizedEmail}: ${(error as Error).message}`,
        );
        // Still count as sent since the record was created
        sent++;
      }
    }

    this.logger.log(
      `Created ${sent} invitations for club ${clubId}, ${duplicates.length} duplicates`,
    );

    return { sent, duplicates };
  }

  async getInvitationStatus(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: {
        club: { select: { name: true, logo: true } },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.acceptedAt) {
      return {
        clubName: invitation.club.name,
        clubLogo: invitation.club.logo,
        email: invitation.email,
        status: 'already_accepted' as const,
      };
    }

    if (new Date() > invitation.expiresAt) {
      return {
        clubName: invitation.club.name,
        clubLogo: invitation.club.logo,
        email: invitation.email,
        status: 'expired' as const,
      };
    }

    return {
      clubName: invitation.club.name,
      clubLogo: invitation.club.logo,
      email: invitation.email,
      status: 'valid' as const,
    };
  }

  async acceptInvitation(token: string, userId: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: {
        club: { select: { id: true, name: true } },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.acceptedAt) {
      throw new ConflictException('Cette invitation a déjà été acceptée');
    }

    if (new Date() > invitation.expiresAt) {
      throw new GoneException(
        'Cette invitation a expiré. Demandez à un administrateur de vous renvoyer une invitation.',
      );
    }

    // Check if user is already a member
    const existingMembership = await this.prisma.clubMember.findUnique({
      where: { userId_clubId: { userId, clubId: invitation.clubId } },
    });

    if (existingMembership) {
      // Mark invitation as accepted anyway
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      return {
        clubId: invitation.clubId,
        clubName: invitation.club.name,
        alreadyMember: true,
      };
    }

    // Create membership and mark invitation accepted in a transaction
    await this.prisma.$transaction([
      this.prisma.clubMember.create({
        data: {
          userId,
          clubId: invitation.clubId,
          role: 'MEMBER',
        },
      }),
      this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    this.logger.log(
      `User ${userId} accepted invitation and joined club ${invitation.clubId}`,
    );

    return {
      clubId: invitation.clubId,
      clubName: invitation.club.name,
      alreadyMember: false,
    };
  }

  async acceptInvitationByToken(token: string): Promise<{
    clubId: string;
    email: string;
    valid: boolean;
  }> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
    });

    if (!invitation || invitation.acceptedAt || new Date() > invitation.expiresAt) {
      return { clubId: '', email: '', valid: false };
    }

    return {
      clubId: invitation.clubId,
      email: invitation.email,
      valid: true,
    };
  }
}
