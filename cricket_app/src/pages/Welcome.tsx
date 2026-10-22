/** First-login onboarding: build the player profile. */
import { useNavigate, useSearchParams } from 'react-router';
import { ProfileForm } from '../components/ProfileForm';
import { Avatar } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useTitle } from '../hooks/useUi';

export default function Welcome() {
  useTitle('Welcome');
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next');
  if (!profile) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="turf mb-6 flex items-center gap-4 rounded-3xl p-6">
        <Avatar name={profile.displayName} photoURL={profile.photoURL} size={64} />
        <div>
          <p className="eyebrow !text-willow">New player</p>
          <h1 className="text-5xl text-chalk">Welcome to the club</h1>
        </div>
      </div>
      <p className="mb-6 text-ink-muted">Tell your captain how you play. You can change any of this later from your profile.</p>
      <ProfileForm
        profile={profile}
        submitLabel="Save and continue"
        onSaved={() => navigate(next && next.startsWith('/') && !next.startsWith('//') && next !== '/welcome' ? next : '/', { replace: true })}
      />
    </div>
  );
}
