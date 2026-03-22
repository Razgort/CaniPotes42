import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import type { JwtPayload } from '../strategies/jwt.strategy.js';

@Injectable()
export class ClubGuard implements CanActivate {
  private readonly logger = new Logger(ClubGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;

    if (!user?.activeClubId) {
      this.logger.warn(`No activeClubId in JWT for user ${user?.sub}`);
      throw new ForbiddenException('No active club selected');
    }

    const membership = await (this.prisma as any).clubMember.findFirst({
      where: {
        userId: user.sub,
        clubId: user.activeClubId,
      },
      select: { role: true },
    });

    if (!membership) {
      this.logger.warn(
        `User ${user.sub} is not a member of club ${user.activeClubId}`,
      );
      throw new ForbiddenException('Not a member of this club');
    }

    request.clubId = user.activeClubId;
    request.clubRole = membership.role;

    return true;
  }
}
