import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@org/api-core';
import type { CreateLicenseType, UpdateLicenseType } from '@org/types';

@Injectable()
export class LicenseService {
  private readonly logger = new Logger(LicenseService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(clubId: string) {
    return this.prisma.licenseType.findMany({
      where: { clubId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneOrThrow(id: string, clubId: string) {
    const licenseType = await this.prisma.licenseType.findFirst({
      where: { id, clubId, deletedAt: null },
    });

    if (!licenseType) {
      throw new NotFoundException('Type de licence introuvable');
    }

    return licenseType;
  }

  async create(clubId: string, dto: CreateLicenseType) {
    const licenseType = await this.prisma.licenseType.create({
      data: {
        clubId,
        name: dto.name,
        amount: dto.amount,
        season: dto.season,
        paymentProvider: dto.paymentProvider,
      },
    });

    this.logger.log(`LicenseType created: ${licenseType.id} for club ${clubId}`);
    return licenseType;
  }

  async update(id: string, clubId: string, dto: UpdateLicenseType) {
    await this.findOneOrThrow(id, clubId);

    const updated = await this.prisma.licenseType.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.season !== undefined && { season: dto.season }),
        ...(dto.paymentProvider !== undefined && { paymentProvider: dto.paymentProvider }),
      },
    });

    this.logger.log(`LicenseType updated: ${id}`);
    return updated;
  }

  async softDelete(id: string, clubId: string) {
    await this.findOneOrThrow(id, clubId);

    await this.prisma.licenseType.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`LicenseType soft-deleted: ${id}`);
    return { deleted: true };
  }
}
