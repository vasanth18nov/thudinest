/**
 * Routes. Everything is served under the base path (/crickethub/ by default).
 *
 * Public (no sign-in): landing, team, fixture and tournament pages and their print views.
 * Signed-in only: everything wrapped in <RequireAuth>.
 */
import { lazy, Suspense, type ComponentType } from 'react';
import {
  createBrowserRouter,
  isRouteErrorResponse,
  Link,
  Navigate,
  RouterProvider,
  useRouteError,
  type RouteObject,
} from 'react-router';
import { AppShell, RequireAuth } from './components/Layout';
import { ButtonLink, ErrorState, PageLoader } from './components/ui';
import { firebaseConfigured } from './firebase';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './hooks/useUi';
import Setup from './pages/Setup';

type PageModule = { default: ComponentType };
/** Code-split a page: each route downloads only what it needs. */
const page = (load: () => Promise<PageModule>): Pick<RouteObject, 'lazy'> => ({
  lazy: async () => ({ Component: (await load()).default }),
});

function Home() {
  const { status } = useAuth();
  if (status === 'loading') return <PageLoader />;
  return status === 'signedIn' ? <DashboardOrWelcome /> : <LandingLazy />;
}

// The home route switches between two pages, so it lazy-loads them itself.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Landing = lazy(() => import('./pages/Landing'));
function LandingLazy() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Landing />
    </Suspense>
  );
}
function DashboardOrWelcome() {
  const { profile } = useAuth();
  if (profile && !profile.onboarded) return <Navigate to="/welcome" replace />;
  return (
    <Suspense fallback={<PageLoader />}>
      <Dashboard />
    </Suspense>
  );
}

function RouteError() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />;
  // A stale chunk after a deploy: reloading fetches the new build.
  const message = error instanceof Error ? error.message : String(error);
  const staleChunk = /dynamically imported module|Importing a module script failed/i.test(message);
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <ErrorState
        title={staleChunk ? 'A new version is available' : 'This page hit a wicket'}
        error={staleChunk ? 'Reload to get the latest version of CricketHub.' : message}
        onRetry={() => window.location.reload()}
      />
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="score text-8xl text-accent">404</p>
      <h1 className="text-4xl">Lost in the outfield</h1>
      <p className="text-ink-muted">That page doesn't exist. It may have been moved or deleted.</p>
      <ButtonLink to="/">Back to home</ButtonLink>
      <Link to="/search" className="link">
        Search instead
      </Link>
    </div>
  );
}

const routes: RouteObject[] = [
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    // Shown while the first lazily loaded page downloads
    hydrateFallbackElement: <PageLoader />,
    children: [
      { index: true, element: <Home /> },
      { path: 'signin', ...page(() => import('./pages/SignIn')) },

      // Public, read-only for visitors; actions appear for signed-in members and organisers
      { path: 'teams/:teamId', ...page(() => import('./pages/TeamPage')) },
      { path: 'fixtures/:fixtureId', ...page(() => import('./pages/FixturePage')) },
      { path: 'tournaments/:tournamentId', ...page(() => import('./pages/TournamentPage')) },
      { path: 'print/team/:teamId', ...page(() => import('./pages/PrintView')) },
      { path: 'print/tournament/:tournamentId', ...page(() => import('./pages/PrintView')) },

      {
        element: <RequireAuth />,
        children: [
          { path: 'welcome', ...page(() => import('./pages/Welcome')) },
          { path: 'profile', ...page(() => import('./pages/Profile')) },
          { path: 'players/:uid', ...page(() => import('./pages/PlayerPage')) },
          { path: 'teams', ...page(() => import('./pages/Teams')) },
          { path: 'teams/new', ...page(() => import('./pages/TeamNew')) },
          { path: 'teams/:teamId/invite', ...page(() => import('./pages/TeamInvite')) },
          { path: 'join/:teamId/:code', ...page(() => import('./pages/JoinTeam')) },
          { path: 'fixtures', ...page(() => import('./pages/Fixtures')) },
          { path: 'fixtures/new', ...page(() => import('./pages/FixtureForm')) },
          { path: 'fixtures/:fixtureId/edit', ...page(() => import('./pages/FixtureForm')) },
          { path: 'fixtures/:fixtureId/result', ...page(() => import('./pages/ResultEntry')) },
          { path: 'tournaments', ...page(() => import('./pages/Tournaments')) },
          { path: 'tournaments/new', ...page(() => import('./pages/TournamentNew')) },
          { path: 'tournaments/:tournamentId/manage', ...page(() => import('./pages/TournamentManage')) },
          { path: 'notifications', ...page(() => import('./pages/Notifications')) },
          { path: 'search', ...page(() => import('./pages/Search')) },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
];

const router = createBrowserRouter(routes, {
  basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/',
});

export function App() {
  if (!firebaseConfigured) return <Setup />;
  return (
    <ToastProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ToastProvider>
  );
}
