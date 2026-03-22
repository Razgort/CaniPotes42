import { VaccineStatus } from '@org/types';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function calculateVaccineStatus(expiryDate: Date | null): VaccineStatus {
  if (!expiryDate) return VaccineStatus.UP_TO_DATE;
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + THIRTY_DAYS_MS);
  if (expiryDate < now) return VaccineStatus.EXPIRED;
  if (expiryDate <= thirtyDaysFromNow) return VaccineStatus.EXPIRING_SOON;
  return VaccineStatus.UP_TO_DATE;
}

export function calculateDogOverallStatus(
  vaccines: Array<{ expiryDate: Date | null }>,
): VaccineStatus {
  if (vaccines.length === 0) return VaccineStatus.UP_TO_DATE;
  const statuses = vaccines.map((v) => calculateVaccineStatus(v.expiryDate));
  if (statuses.includes(VaccineStatus.EXPIRED)) return VaccineStatus.EXPIRED;
  if (statuses.includes(VaccineStatus.EXPIRING_SOON)) return VaccineStatus.EXPIRING_SOON;
  return VaccineStatus.UP_TO_DATE;
}
