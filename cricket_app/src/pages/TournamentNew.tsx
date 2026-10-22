import { useNavigate } from 'react-router';
import { TournamentForm } from '../components/TournamentForm';
import { PageHeader } from '../components/ui';
import { friendlyError } from '../data/common';
import { createTournament } from '../data/tournaments';
import { useAuth } from '../hooks/useAuth';
import { useTitle, useToast } from '../hooks/useUi';

export default function TournamentNew() {
  useTitle('New tournament');
  const { profile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  if (!profile) return null;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Tournaments" title="New tournament" />
      <TournamentForm
        submitLabel="Create tournament"
        onSubmit={async (input) => {
          try {
            const id = await createTournament(input, profile);
            toast.show('Tournament created. Add the teams next.');
            navigate(`/tournaments/${id}/manage`, { replace: true });
          } catch (err) {
            throw new Error(friendlyError(err));
          }
        }}
      />
    </div>
  );
}
