import { useAuth } from '@org/data-access';
import { LicenseMemberView } from './LicenseMemberView';

export default function LicensesPage() {
  const { activeClub } = useAuth();

  if (!activeClub) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <LicenseMemberView clubId={activeClub.id} />
    </div>
  );
}
