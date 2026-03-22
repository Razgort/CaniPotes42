import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@org/api-core';
import type { CreateVaccine } from '@org/types';
import { calculateVaccineStatus, calculateDogOverallStatus } from './vaccine-status.util.js';

@Injectable()
export class VaccineService {
  private readonly logger = new Logger(VaccineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listVaccines(dogId: string, clubId: string) {
    // Verify dog belongs to club
    const dog = await this.prisma.dog.findFirst({
      where: { id: dogId, clubId },
    });
    if (!dog) throw new NotFoundException('Dog not found');

    const vaccines = await this.prisma.vaccineRecord.findMany({
      where: { dogId },
      orderBy: { expiryDate: 'asc' },
    });

    return vaccines.map((v) => ({
      ...v,
      status: calculateVaccineStatus(v.expiryDate),
    }));
  }

  async createVaccine(
    dogId: string,
    clubId: string,
    userId: string,
    dto: CreateVaccine,
  ) {
    const dog = await this.prisma.dog.findFirst({
      where: { id: dogId, clubId },
    });
    if (!dog) throw new NotFoundException('Dog not found');
    if (dog.userId !== userId)
      throw new ForbiddenException('Only the dog owner can add vaccine records');

    const vaccine = await this.prisma.vaccineRecord.create({
      data: {
        dogId,
        vaccineName: dto.vaccineName,
        dateAdministered: new Date(dto.dateAdministered),
        expiryDate: new Date(dto.expiryDate),
      },
    });

    this.logger.log(`Vaccine created: ${vaccine.id} for dog ${dogId}`);

    return {
      ...vaccine,
      status: calculateVaccineStatus(vaccine.expiryDate),
    };
  }

  async updateVaccine(
    dogId: string,
    vaccineId: string,
    clubId: string,
    userId: string,
    dto: Partial<CreateVaccine>,
  ) {
    const dog = await this.prisma.dog.findFirst({
      where: { id: dogId, clubId },
    });
    if (!dog) throw new NotFoundException('Dog not found');
    if (dog.userId !== userId)
      throw new ForbiddenException('Only the dog owner can edit vaccine records');

    const vaccine = await this.prisma.vaccineRecord.findFirst({
      where: { id: vaccineId, dogId },
    });
    if (!vaccine) throw new NotFoundException('Vaccine record not found');

    const updated = await this.prisma.vaccineRecord.update({
      where: { id: vaccineId },
      data: {
        ...(dto.vaccineName !== undefined && { vaccineName: dto.vaccineName }),
        ...(dto.dateAdministered !== undefined && {
          dateAdministered: new Date(dto.dateAdministered),
        }),
        ...(dto.expiryDate !== undefined && {
          expiryDate: new Date(dto.expiryDate),
        }),
      },
    });

    this.logger.log(`Vaccine updated: ${vaccineId}`);

    return {
      ...updated,
      status: calculateVaccineStatus(updated.expiryDate),
    };
  }

  async deleteVaccine(
    dogId: string,
    vaccineId: string,
    clubId: string,
    userId: string,
  ) {
    const dog = await this.prisma.dog.findFirst({
      where: { id: dogId, clubId },
    });
    if (!dog) throw new NotFoundException('Dog not found');
    if (dog.userId !== userId)
      throw new ForbiddenException('Only the dog owner can delete vaccine records');

    const vaccine = await this.prisma.vaccineRecord.findFirst({
      where: { id: vaccineId, dogId },
    });
    if (!vaccine) throw new NotFoundException('Vaccine record not found');

    await this.prisma.vaccineRecord.delete({ where: { id: vaccineId } });
    this.logger.log(`Vaccine deleted: ${vaccineId}`);

    return { message: 'Vaccine record deleted' };
  }

  async uploadCertificate(
    dogId: string,
    vaccineId: string,
    clubId: string,
    userId: string,
    certificateUrl: string,
  ) {
    const dog = await this.prisma.dog.findFirst({
      where: { id: dogId, clubId },
    });
    if (!dog) throw new NotFoundException('Dog not found');
    if (dog.userId !== userId)
      throw new ForbiddenException('Only the dog owner can upload certificates');

    const vaccine = await this.prisma.vaccineRecord.findFirst({
      where: { id: vaccineId, dogId },
    });
    if (!vaccine) throw new NotFoundException('Vaccine record not found');

    const updated = await this.prisma.vaccineRecord.update({
      where: { id: vaccineId },
      data: { certificateUrl },
    });

    this.logger.log(`Certificate uploaded for vaccine: ${vaccineId}`);

    return {
      ...updated,
      status: calculateVaccineStatus(updated.expiryDate),
    };
  }

  async deleteCertificate(
    dogId: string,
    vaccineId: string,
    clubId: string,
    userId: string,
  ) {
    const dog = await this.prisma.dog.findFirst({
      where: { id: dogId, clubId },
    });
    if (!dog) throw new NotFoundException('Dog not found');
    if (dog.userId !== userId)
      throw new ForbiddenException('Only the dog owner can remove certificates');

    const vaccine = await this.prisma.vaccineRecord.findFirst({
      where: { id: vaccineId, dogId },
    });
    if (!vaccine) throw new NotFoundException('Vaccine record not found');

    const updated = await this.prisma.vaccineRecord.update({
      where: { id: vaccineId },
      data: { certificateUrl: null },
    });

    this.logger.log(`Certificate deleted for vaccine: ${vaccineId}`);
    return { ...updated, status: calculateVaccineStatus(updated.expiryDate) };
  }

  async getDogOverallStatus(dogId: string, clubId: string) {
    const dog = await this.prisma.dog.findFirst({
      where: { id: dogId, clubId },
    });
    if (!dog) throw new NotFoundException('Dog not found');

    const vaccines = await this.prisma.vaccineRecord.findMany({
      where: { dogId },
      select: { expiryDate: true },
    });

    return calculateDogOverallStatus(vaccines);
  }
}
