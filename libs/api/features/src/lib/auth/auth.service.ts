import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@org/api-core';
import * as bcrypt from 'bcrypt';
import type { RegisterWithConsent } from './dto/register.dto.js';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

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
}
