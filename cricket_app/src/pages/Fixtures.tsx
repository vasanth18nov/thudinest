/** All fixtures for every team I'm in. */
import { collection, orderBy, query, where } from 'firebase/firestore';
import { Plus } from 'lucide-react';
import { FixtureList } from '../components/FixtureList';
import { ButtonLink, EmptyState, PageHeader } from '../components/ui';
import { db } from '../firebase';
import { canManageMatches, useAuth } from '../hooks/useAuth';
import { useQueryData } from '../hooks/useFirestore';
import { useTitle } from '../hooks/useUi';
import type { Fixture } from '../lib/types';

export default function Fixtures() {
  useTitle('Fixtures');
  const { memberships } = useAuth();
  // array-contains-any takes up to 30 values — far more teams than anyone plays for
  const teamIds = memberships.map((m) => m.teamId).sort().slice(0, 30);
  const fixtures = useQueryData<Fixture>(teamIds.length ? `my-fixtures-${teamIds.join(',')}` : null, () =>
    query(collection(db, 'fixtures'), where('teamIds', 'array-contains-any', teamIds), orderBy('startsAt', 'asc')),
  );
  const managed = memberships.find((m) => canManageMatches(m.role));

  return (
    <div>
      <PageHeader
        eyebrow="All my teams"
        title="Fixtures"
        actions={
          managed && (
            <ButtonLink to={`/fixtures/new?team=${managed.teamId}`} icon={<Plus size={18} aria-hidden />}>
              New fixture
            </ButtonLink>
          )
        }
      />
      {teamIds.length === 0 ? (
        <EmptyState title="No teams, no fixtures" body="Join or create a team to see its fixtures here." action={<ButtonLink to="/teams">Go to teams</ButtonLink>} />
      ) : (
        <FixtureList
          fixtures={fixtures.data}
          loading={fixtures.loading}
          error={fixtures.error}
          fromCache={fixtures.fromCache}
          exportName="my"
          empty={<EmptyState title="No fixtures yet" body="When your captain schedules a match it appears here, with a reminder in your inbox." />}
        />
      )}
    </div>
  );
}
