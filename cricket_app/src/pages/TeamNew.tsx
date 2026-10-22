import { useNavigate } from 'react-router';
import { TeamForm } from '../components/TeamForm';
import { PageHeader } from '../components/ui';
import { friendlyError } from '../data/common';
import { createTeam } from '../data/teams';
import { useAuth } from '../hooks/useAuth';
import { useTitle, useToast } from '../hooks/useUi';

export default function TeamNew() {
  useTitle('New team');
  const { profile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  if (!profile) return null;

  return (
    <div>
      <PageHeader eyebrow="Teams" title="Start a team" />
      <TeamForm
        submitLabel="Create team"
        onSubmit={async (input) => {
          try {
            const id = await createTeam(input, profile);
            toast.show(`${input.name} created. Now invite your players.`);
            navigate(`/teams/${id}/invite`, { replace: true });
          } catch (err) {
            throw new Error(friendlyError(err));
          }
        }}
      />
    </div>
  );
}
