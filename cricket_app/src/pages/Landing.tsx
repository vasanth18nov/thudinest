/** Signed-out home page. */
import { CalendarDays, ClipboardList, Trophy, Users } from 'lucide-react';
import { ButtonLink } from '../components/ui';
import { useTitle } from '../hooks/useUi';

const FEATURES = [
  { icon: Users, title: 'Teams & squads', body: 'Invite players by link, email or search. Owners, admins, captains and vice-captains each get the right controls.' },
  { icon: CalendarDays, title: 'Fixtures & RSVP', body: 'Calendar and list views, one-tap availability, and a playing XI the captain picks from who said yes.' },
  { icon: ClipboardList, title: 'Scorecards & stats', body: 'Enter batting and bowling figures once. Averages, strike rates and economy add themselves up.' },
  { icon: Trophy, title: 'Tournaments', body: 'Leagues, knockouts or groups then knockout. Auto-drawn fixtures, live points table with NRR, and a bracket.' },
];

export default function Landing() {
  useTitle(null);
  return (
    <div className="-mt-6 flex flex-col gap-14">
      {/* Hero on a mown outfield */}
      <section className="turf relative -mx-4 overflow-hidden px-4 pb-14 pt-12 sm:mx-0 sm:rounded-b-[2rem] sm:px-10">
        <div className="pointer-events-none absolute inset-y-0 right-[12%] hidden w-28 bg-strip/80 [mask-image:linear-gradient(transparent,black_15%,black_85%,transparent)] md:block" aria-hidden>
          <div className="absolute inset-x-0 top-[18%] h-0.5 bg-chalk/90" />
          <div className="absolute inset-x-0 top-[24%] h-0.5 bg-chalk/90" />
          <div className="absolute inset-x-0 bottom-[18%] h-0.5 bg-chalk/90" />
          <div className="absolute inset-x-0 bottom-[24%] h-0.5 bg-chalk/90" />
        </div>
        <div className="relative max-w-2xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-black/25 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-willow">
            <span className="size-2 rounded-full bg-leather-bright" /> Club cricket, organised
          </p>
          <h1 className="text-[clamp(3.4rem,13vw,7.5rem)] font-black text-chalk">
            Every fixture.
            <br />
            Every run.
            <br />
            <span className="text-willow">One scorebook.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-chalk/85">
            CricketHub runs your club from the team sheet to the trophy: who's available on Saturday, who's in the XI, what they scored and where you sit on the
            table.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/signin" size="lg" className="!bg-chalk !text-pitch-900">
              Sign in with Google
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* Scoreboard-style feature list */}
      <section aria-labelledby="features" className="grid gap-4 sm:grid-cols-2">
        <h2 id="features" className="sr-only">
          Features
        </h2>
        {FEATURES.map((f, i) => (
          <article key={f.title} className="card animate-rise flex gap-4 p-5" style={{ animationDelay: `${i * 60}ms` }}>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <f.icon size={24} aria-hidden />
            </span>
            <div>
              <h3 className="text-2xl">{f.title}</h3>
              <p className="mt-1 text-ink-muted">{f.body}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="card crease flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl">Running a tournament?</h2>
          <p className="text-ink-muted">Anyone can follow a tournament's fixtures, table and bracket from a shared link — no account needed.</p>
        </div>
        <ButtonLink to="/signin" variant="secondary">
          Create one
        </ButtonLink>
      </section>
    </div>
  );
}
