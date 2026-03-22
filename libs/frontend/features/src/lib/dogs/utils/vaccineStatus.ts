import type { VaccineStatusValue } from '@org/ui';

const STATUS_PRIORITY: Record<VaccineStatusValue, number> = {
  EXPIRED: 2,
  EXPIRING_SOON: 1,
  UP_TO_DATE: 0,
};

export function calculateDogOverallStatus(
  vaccines: Array<{ status: VaccineStatusValue }>,
): VaccineStatusValue {
  if (vaccines.length === 0) return 'UP_TO_DATE';
  return vaccines.reduce<VaccineStatusValue>((worst, v) => {
    return STATUS_PRIORITY[v.status] > STATUS_PRIORITY[worst] ? v.status : worst;
  }, 'UP_TO_DATE');
}
