import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@org/api-core';
import type { CreateDog, UpdateDog } from '@org/types';
import type { JwtPayload } from '@org/api-core';

export interface DogDto {
  id: string;
  name: string;
  breed: string | null;
  birthdate: string | null;
  chipNumber: string | null;
  photoUrl: string | null;
  userId: string;
  clubId: string;
  createdAt: string;
  updatedAt: string;
  owner?: {
    firstName: string;
    lastName: string;
  };
}

@Injectable()
export class DogService {
  private readonly logger = new Logger(DogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDog, user: JwtPayload): Promise<{ data: DogDto }> {
    const dog = await this.prisma.dog.create({
      data: {
        name: dto.name,
        breed: dto.breed ?? null,
        birthdate: dto.birthdate ? new Date(dto.birthdate) : null,
        chipNumber: dto.chipNumber ?? null,
        photoUrl: null, // set via photo upload endpoint
        userId: user.sub,
        clubId: user.activeClubId,
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    this.logger.log(`Dog created: ${dog.id} by user ${user.sub}`);
    return { data: this.mapDog(dog) };
  }

  async findAllForUser(
    userId: string,
    clubId: string,
  ): Promise<{ data: DogDto[]; meta: { total: number; page: number; pageSize: number } }> {
    const [dogs, total] = await Promise.all([
      this.prisma.dog.findMany({
        where: { userId, clubId },
        include: {
          user: { select: { firstName: true, lastName: true } },
          vaccineRecords: { select: { expiryDate: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.dog.count({ where: { userId, clubId } }),
    ]);

    return {
      data: dogs.map((d) => this.mapDog(d)),
      meta: { total, page: 1, pageSize: total || 20 },
    };
  }

  async findAllForClub(
    clubId: string,
  ): Promise<{ data: DogDto[]; meta: { total: number; page: number; pageSize: number } }> {
    const [dogs, total] = await Promise.all([
      this.prisma.dog.findMany({
        where: { clubId },
        include: {
          user: { select: { firstName: true, lastName: true } },
          vaccineRecords: { select: { expiryDate: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.dog.count({ where: { clubId } }),
    ]);

    return {
      data: dogs.map((d) => this.mapDog(d)),
      meta: { total, page: 1, pageSize: total || 20 },
    };
  }

  async findOne(dogId: string, clubId: string): Promise<{ data: DogDto }> {
    const dog = await this.prisma.dog.findFirst({
      where: { id: dogId, clubId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        vaccineRecords: { select: { expiryDate: true } },
      },
    });

    if (!dog) {
      throw new NotFoundException('Dog not found');
    }

    return { data: this.mapDog(dog) };
  }

  async update(
    dogId: string,
    userId: string,
    clubId: string,
    dto: UpdateDog,
  ): Promise<{ data: DogDto }> {
    await this.verifyOwnership(dogId, userId, clubId);

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.breed !== undefined) updateData.breed = dto.breed ?? null;
    if (dto.birthdate !== undefined)
      updateData.birthdate = dto.birthdate ? new Date(dto.birthdate) : null;
    if (dto.chipNumber !== undefined) updateData.chipNumber = dto.chipNumber ?? null;

    const dog = await this.prisma.dog.update({
      where: { id: dogId },
      data: updateData,
      include: {
        user: { select: { firstName: true, lastName: true } },
        vaccineRecords: { select: { expiryDate: true } },
      },
    });

    this.logger.log(`Dog updated: ${dogId} by user ${userId}`);
    return { data: this.mapDog(dog) };
  }

  async updatePhoto(
    dogId: string,
    userId: string,
    clubId: string,
    photoUrl: string,
  ): Promise<{ data: DogDto }> {
    await this.verifyOwnership(dogId, userId, clubId);

    const dog = await this.prisma.dog.update({
      where: { id: dogId },
      data: { photoUrl },
      include: {
        user: { select: { firstName: true, lastName: true } },
        vaccineRecords: { select: { expiryDate: true } },
      },
    });

    this.logger.log(`Dog photo updated: ${dogId} by user ${userId}`);
    return { data: this.mapDog(dog) };
  }

  async getPhotoUrl(dogId: string, clubId: string): Promise<string | null> {
    const dog = await this.prisma.dog.findFirst({
      where: { id: dogId, clubId },
      select: { photoUrl: true },
    });
    return dog?.photoUrl ?? null;
  }

  async remove(dogId: string, userId: string, clubId: string): Promise<void> {
    await this.verifyOwnership(dogId, userId, clubId);

    await this.prisma.dog.delete({ where: { id: dogId } });

    this.logger.log(`Dog deleted: ${dogId} by user ${userId}`);
  }

  private async verifyOwnership(
    dogId: string,
    userId: string,
    clubId: string,
  ): Promise<void> {
    const dog = await this.prisma.dog.findFirst({
      where: { id: dogId, clubId },
      select: { userId: true },
    });

    if (!dog) {
      throw new NotFoundException('Dog not found');
    }

    if (dog.userId !== userId) {
      throw new ForbiddenException('You can only modify your own dogs');
    }
  }

  private mapDog(dog: any): DogDto {
    return {
      id: dog.id,
      name: dog.name,
      breed: dog.breed ?? null,
      birthdate: dog.birthdate ? dog.birthdate.toISOString() : null,
      chipNumber: dog.chipNumber ?? null,
      photoUrl: dog.photoUrl ?? null,
      userId: dog.userId,
      clubId: dog.clubId,
      createdAt: dog.createdAt.toISOString(),
      updatedAt: dog.updatedAt.toISOString(),
      owner: dog.user
        ? { firstName: dog.user.firstName, lastName: dog.user.lastName }
        : undefined,
    };
  }
}
