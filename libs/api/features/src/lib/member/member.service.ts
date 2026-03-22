import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@org/api-core';
import { Role } from '@org/types';
import type { FindMembersQuery, UpdateProfile } from '@org/types';

@Injectable()
export class MemberService {
  private readonly logger = new Logger(MemberService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(clubId: string, query: FindMembersQuery, callerRole: string) {
    const { page, pageSize } = query;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { clubId };

    // Search/filter only available for ADMIN/OWNER
    if (callerRole !== 'MEMBER') {
      if (query.search) {
        where['OR'] = [
          { user: { firstName: { contains: query.search, mode: 'insensitive' } } },
          { user: { lastName: { contains: query.search, mode: 'insensitive' } } },
          { user: { email: { contains: query.search, mode: 'insensitive' } } },
        ];
      }
      if (query.role) {
        where['role'] = query.role;
      }
    }

    const [members, total] = await Promise.all([
      (this.prisma as any).clubMember.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: pageSize,
      }),
      (this.prisma as any).clubMember.count({ where }),
    ]);

    return {
      data: members.map(this.mapMember),
      meta: { total, page, pageSize },
    };
  }

  async findOne(clubId: string, memberId: string) {
    const member = await (this.prisma as any).clubMember.findFirst({
      where: { id: memberId, clubId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return this.mapMember(member);
  }

  async updateProfile(
    clubId: string,
    memberId: string,
    userId: string,
    dto: UpdateProfile,
  ) {
    // Verify the member exists and belongs to this club
    const member = await (this.prisma as any).clubMember.findFirst({
      where: { id: memberId, clubId },
      select: { userId: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Self-only: ensure the caller owns this membership
    if (member.userId !== userId) {
      throw new ForbiddenException('You can only edit your own profile');
    }

    // Update User record (firstName, lastName)
    await (this.prisma as any).user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatarUrl: true,
      },
    });

    // Re-fetch the member to get complete data
    const updatedMember = await (this.prisma as any).clubMember.findFirst({
      where: { id: memberId, clubId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return this.mapMember(updatedMember);
  }

  async updateAvatar(
    clubId: string,
    memberId: string,
    userId: string,
    avatarUrl: string,
  ) {
    const member = await (this.prisma as any).clubMember.findFirst({
      where: { id: memberId, clubId },
      select: { userId: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.userId !== userId) {
      throw new ForbiddenException('You can only update your own avatar');
    }

    await (this.prisma as any).user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    const updatedMember = await (this.prisma as any).clubMember.findFirst({
      where: { id: memberId, clubId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return this.mapMember(updatedMember);
  }

  async updateRole(
    clubId: string,
    memberId: string,
    newRole: Role,
    requestingUserId: string,
    requestingRole: string,
  ) {
    if (newRole === Role.OWNER) {
      throw new ForbiddenException('Cannot promote to Owner');
    }

    const target = await (this.prisma as any).clubMember.findFirst({
      where: { id: memberId, clubId },
      select: { id: true, userId: true, role: true },
    });

    if (!target) {
      throw new NotFoundException('Member not found');
    }

    if (target.role === Role.OWNER) {
      throw new ForbiddenException('Cannot change the Owner role');
    }

    if (requestingRole === Role.ADMIN) {
      if (target.userId === requestingUserId) {
        throw new ForbiddenException('Admins cannot demote themselves');
      }
    }

    await (this.prisma as any).clubMember.update({
      where: { id: memberId },
      data: { role: newRole },
    });

    this.logger.log(
      `Role updated: member ${memberId} → ${newRole} by user ${requestingUserId}`,
    );

    const updated = await this.findOne(clubId, memberId);
    return updated;
  }

  async removeMember(
    clubId: string,
    memberId: string,
    requestingUserId: string,
    requestingRole: string,
  ) {
    const target = await (this.prisma as any).clubMember.findFirst({
      where: { id: memberId, clubId },
      select: { id: true, userId: true, role: true },
    });

    if (!target) {
      throw new NotFoundException('Member not found');
    }

    if (target.role === Role.OWNER) {
      await this.assertNotSoleOwner(clubId);
    }

    if (requestingRole === Role.ADMIN && target.role === Role.OWNER) {
      throw new ForbiddenException('Admins cannot remove the Owner');
    }

    await (this.prisma as any).clubMember.delete({
      where: { id: memberId },
    });

    this.logger.log(
      `Member ${memberId} removed from club ${clubId} by user ${requestingUserId}`,
    );
  }

  async suspendMember(
    clubId: string,
    memberId: string,
    requestingUserId: string,
    requestingRole: string,
  ) {
    const target = await (this.prisma as any).clubMember.findFirst({
      where: { id: memberId, clubId },
      select: { id: true, userId: true, role: true, status: true },
    });

    if (!target) {
      throw new NotFoundException('Member not found');
    }

    if (target.role === Role.OWNER) {
      throw new ForbiddenException('Cannot suspend the Owner');
    }

    if (requestingRole === Role.ADMIN && target.role === Role.OWNER) {
      throw new ForbiddenException('Admins cannot suspend the Owner');
    }

    if (target.userId === requestingUserId) {
      throw new ForbiddenException('Cannot suspend yourself');
    }

    if (target.status === 'SUSPENDED') {
      throw new BadRequestException('Member is already suspended');
    }

    await (this.prisma as any).clubMember.update({
      where: { id: memberId },
      data: { status: 'SUSPENDED', suspendedAt: new Date() },
    });

    this.logger.log(
      `Member ${memberId} suspended in club ${clubId} by user ${requestingUserId}`,
    );

    return this.findOne(clubId, memberId);
  }

  async unsuspendMember(clubId: string, memberId: string) {
    const target = await (this.prisma as any).clubMember.findFirst({
      where: { id: memberId, clubId },
      select: { id: true, status: true },
    });

    if (!target) {
      throw new NotFoundException('Member not found');
    }

    if (target.status !== 'SUSPENDED') {
      throw new BadRequestException('Member is not suspended');
    }

    await (this.prisma as any).clubMember.update({
      where: { id: memberId },
      data: { status: 'ACTIVE', suspendedAt: null },
    });

    this.logger.log(`Member ${memberId} unsuspended in club ${clubId}`);

    return this.findOne(clubId, memberId);
  }

  private async assertNotSoleOwner(clubId: string) {
    const ownerCount = await (this.prisma as any).clubMember.count({
      where: { clubId, role: Role.OWNER },
    });

    if (ownerCount <= 1) {
      throw new ForbiddenException(
        'Vous devez transférer la propriété avant de quitter le club',
      );
    }
  }

  private mapMember(member: any) {
    return {
      id: member.id,
      userId: member.user.id,
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      email: member.user.email,
      avatarUrl: member.user.avatarUrl,
      role: member.role,
      status: member.status,
      suspendedAt: member.suspendedAt,
      createdAt: member.createdAt,
    };
  }
}
