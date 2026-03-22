import { useNavigate } from 'react-router-dom';
import { useAuth } from '@org/data-access';
import { LicenseTypeList } from './LicenseTypeList';

export default function LicenseSettingsPage() {
  const { activeClub, role } = useAuth();
  const navigate = useNavigate();

  if (!activeClub) {
    return null;
  }

  const isAdminOrOwner = role === 'ADMIN' || role === 'OWNER';

  if (!isAdminOrOwner) {
    navigate('/licenses', { replace: true });
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <LicenseTypeList clubId={activeClub.id} />
    </div>
  );
}
