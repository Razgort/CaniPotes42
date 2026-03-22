import { z } from 'zod';

export type VaccineStatusValue = 'UP_TO_DATE' | 'EXPIRING_SOON' | 'EXPIRED';

export const createVaccineSchema = z.object({
  vaccineName: z.string().min(1).max(200),
  dateAdministered: z.string().date(),
  expiryDate: z.string().date(),
});

export type CreateVaccine = z.infer<typeof createVaccineSchema>;

// Dashboard query schema
export const vaccineDashboardQuerySchema = z.object({
  status: z.enum(['UP_TO_DATE', 'EXPIRING_SOON', 'EXPIRED']).optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type VaccineDashboardQuery = z.infer<typeof vaccineDashboardQuerySchema>;

// Response types for dashboard
export interface VaccineRecordRow {
  id: string;
  vaccineName: string;
  dateAdministered: string;
  expiryDate: string | null;
  status: 'UP_TO_DATE' | 'EXPIRING_SOON' | 'EXPIRED';
  daysUntilExpiry: number | null;
}

export interface VaccineDogRow {
  dogId: string;
  dogName: string;
  dogPhotoUrl: string | null;
  ownerFirstName: string;
  ownerLastName: string;
  memberId: string;
  overallStatus: 'UP_TO_DATE' | 'EXPIRING_SOON' | 'EXPIRED';
  nextExpiryDate: string | null;
  daysUntilExpiry: number | null;
  vaccineRecords: VaccineRecordRow[];
}

export interface VaccineDashboardSummary {
  ok: number;
  warning: number;
  critical: number;
}

export interface VaccineDashboardResponse {
  data: {
    summary: VaccineDashboardSummary;
    dogs: VaccineDogRow[];
  };
  meta: {
    total: number;
    page: number;
    pageSize: number;
  };
}
