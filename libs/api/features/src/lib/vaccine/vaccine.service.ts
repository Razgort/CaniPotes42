import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@org/api-core';
import { VaccineStatus } from '@org/types';
import type {
  VaccineDashboardQuery,
  VaccineDogRow,
  VaccineRecordRow,
  VaccineDashboardSummary,
} from '@org/types';
import { calculateVaccineStatus } from '../dog/vaccine-status.util.js';

const STATUS_SORT_ORDER: Record<VaccineStatus, number> = {
  [VaccineStatus.EXPIRED]: 0,
  [VaccineStatus.EXPIRING_SOON]: 1,
  [VaccineStatus.UP_TO_DATE]: 2,
};

function computeWorstStatus(statuses: VaccineStatus[]): VaccineStatus {
  // Dogs with no vaccine records are treated as EXPIRED (missing vaccines)
  if (statuses.length === 0) return VaccineStatus.EXPIRED;
  return statuses.reduce((worst, current) =>
    STATUS_SORT_ORDER[current] < STATUS_SORT_ORDER[worst] ? current : worst,
  );
}

function computeDaysUntilExpiry(expiryDate: Date): number {
  const now = new Date();
  return Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

@Injectable()
export class VaccineService {
  private readonly logger = new Logger(VaccineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getClubVaccineSummary(clubId: string, query: VaccineDashboardQuery) {
    this.logger.log(`Fetching vaccine dashboard for club ${clubId}`);

    const dogs = await (this.prisma as any).dog.findMany({
      where: { clubId },
      include: {
        vaccineRecords: {
          select: {
            id: true,
            vaccineName: true,
            dateAdministered: true,
            expiryDate: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Build dog rows with computed statuses
    const dogRows: VaccineDogRow[] = dogs.map((dog: any) => {
      const vaccineRows: VaccineRecordRow[] = dog.vaccineRecords.map((v: any) => {
        const status = calculateVaccineStatus(v.expiryDate);
        return {
          id: v.id,
          vaccineName: v.vaccineName,
          dateAdministered: (v.dateAdministered as Date).toISOString(),
          expiryDate: v.expiryDate ? (v.expiryDate as Date).toISOString() : null,
          status,
          daysUntilExpiry: v.expiryDate ? computeDaysUntilExpiry(v.expiryDate) : null,
        };
      });

      // Compute overall status from records that have an expiryDate
      const statusesWithExpiry = dog.vaccineRecords
        .filter((v: any) => v.expiryDate !== null)
        .map((v: any) => calculateVaccineStatus(v.expiryDate));

      // If dog has records but none have expiryDate, treat as UP_TO_DATE (unknown)
      // If dog has zero records at all, treat as EXPIRED (missing)
      const overallStatus =
        dog.vaccineRecords.length === 0
          ? VaccineStatus.EXPIRED
          : computeWorstStatus(statusesWithExpiry.length > 0 ? statusesWithExpiry : [VaccineStatus.UP_TO_DATE]);

      // Find the nearest upcoming expiry date (for "days until expiry" display)
      const recordsWithExpiry = dog.vaccineRecords.filter((v: any) => v.expiryDate !== null);
      const now = new Date();
      const upcomingExpiry = recordsWithExpiry
        .filter((v: any) => (v.expiryDate as Date) >= now)
        .sort((a: any, b: any) => (a.expiryDate as Date).getTime() - (b.expiryDate as Date).getTime())[0];
      const mostRecentExpired = recordsWithExpiry
        .filter((v: any) => (v.expiryDate as Date) < now)
        .sort((a: any, b: any) => (b.expiryDate as Date).getTime() - (a.expiryDate as Date).getTime())[0];

      const displayExpiry = upcomingExpiry ?? mostRecentExpired;

      return {
        dogId: dog.id,
        dogName: dog.name,
        dogPhotoUrl: dog.photoUrl ?? null,
        ownerFirstName: dog.user.firstName,
        ownerLastName: dog.user.lastName,
        memberId: dog.userId,
        overallStatus,
        nextExpiryDate: displayExpiry?.expiryDate
          ? (displayExpiry.expiryDate as Date).toISOString()
          : null,
        daysUntilExpiry: displayExpiry?.expiryDate
          ? computeDaysUntilExpiry(displayExpiry.expiryDate)
          : null,
        vaccineRecords: vaccineRows,
      };
    });

    // Sort: problems first (EXPIRED → EXPIRING_SOON → UP_TO_DATE)
    dogRows.sort(
      (a, b) => STATUS_SORT_ORDER[a.overallStatus] - STATUS_SORT_ORDER[b.overallStatus],
    );

    // Aggregate summary (always from full unfiltered set)
    const summary: VaccineDashboardSummary = {
      ok: dogRows.filter((d) => d.overallStatus === VaccineStatus.UP_TO_DATE).length,
      warning: dogRows.filter((d) => d.overallStatus === VaccineStatus.EXPIRING_SOON).length,
      critical: dogRows.filter((d) => d.overallStatus === VaccineStatus.EXPIRED).length,
    };

    // Apply search filter
    let filtered = dogRows;
    if (query.search) {
      const search = query.search.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.dogName.toLowerCase().includes(search) ||
          d.ownerFirstName.toLowerCase().includes(search) ||
          d.ownerLastName.toLowerCase().includes(search),
      );
    }

    // Apply status filter
    if (query.status) {
      filtered = filtered.filter((d) => d.overallStatus === query.status);
    }

    // Paginate
    const total = filtered.length;
    const { page, pageSize } = query;
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    return {
      data: {
        summary,
        dogs: paginated,
      },
      meta: { total, page, pageSize },
    };
  }
}
