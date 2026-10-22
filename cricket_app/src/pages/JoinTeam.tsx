/** Landing page for a shareable invite link: /join/:teamId/:code */
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { Button, ButtonLink, EmptyState, PageLoader, TeamBadge } from '../components/ui';
import { joinWithCode } from '../data/teams';
import { useAuth } from '../hooks/useAuth';
import { useDocData } from '../hooks/useFirestore';
import { useTitle, useToast } from '../hooks/useUi';
import type { Team } from '../lib/types';

export default function JoinTeam() {
  const { teamId = '', code = '' } = useParams();
  const { profile, roleIn } = useAuth();
  const team = useDocData<Team>(`teams/${teamId}`);
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useTitle(team.data ? `Join ${team.data.name}` : 'Join team');

  if (team.loading) return <PageLoader />;
  if (!team.data) return <EmptyState title="Team not found" body="This invite link points to a team that no longer exists." action={<ButtonLink to="/">Home</ButtonLink>} />;
  if (roleIn(teamId)) return <Navigate to={`/teams/${teamId}`} replace />;

  const t = team.data;
  const join = async () => {
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      await joinWithCode(teamId, code, profile);
      toast.show(`Welcome to ${t.name}!`);
      navigate(`/teams/${teamId}`, { replace: true });
    } catch (err) {
      const denied = (err as { code?: string }).code === 'permission-denied';
      setError(denied ? 'This invite link has expired or been reset. Ask a team admin for a new one.' : 'Could not join. Check your connection and try again.');
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-8 text-center">
      <div className="turf flex w-full flex-col items-center gap-4 rounded-3xl p-8">
        <TeamBadge name={t.name} shortName={t.shortName} logo={t.logoDataUrl} colors={t.colors} size={104} />
        <p className="eyebrow !text-willow">You're invited to join</p>
        <h1 className="text-5xl text-chalk">{t.name}</h1>
        {t.homeGround && <p className="text-chalk/85">{t.homeGround}</p>}
      </div>
      <Button size="lg" className="w-full" loading={busy} onClick={join}>
        Join as a player
      </Button>
      {error && (
        <p role="alert" className="font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
