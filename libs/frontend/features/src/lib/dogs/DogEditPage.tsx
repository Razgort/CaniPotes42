import { useParams } from 'react-router-dom';
import { useAuth } from '@org/data-access';
import { SkeletonList } from '@org/ui';
import { useDogDetail } from './hooks/useDogs';
import { DogForm } from './DogForm';

export default function DogEditPage() {
  const { dogId } = useParams<{ dogId: string }>();
  const { activeClub } = useAuth();
  const clubId = activeClub?.id ?? null;

  const { data, isLoading } = useDogDetail(clubId, dogId);

  if (isLoading) return <SkeletonList />;

  return (
    <div className="py-6">
      <DogForm existingDog={data?.data} />
    </div>
  );
}
