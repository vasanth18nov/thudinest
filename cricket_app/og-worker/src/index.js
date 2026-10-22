/**
 * CricketHub Open Graph worker (optional).
 *
 * GitHub Pages only serves static files, so link previews (WhatsApp, Slack, iMessage, X…)
 * would all show the same generic card. Deployed on the route thudinest.com/crickethub/*,
 * this Cloudflare Worker:
 *   1. Serves the app's index.html for deep links GitHub Pages would 404 (SPA fallback).
 *   2. For /teams/:id, /fixtures/:id and /tournaments/:id, reads that public document from
 *      Firestore's REST API and rewrites the <title> and og:/twitter: meta tags.
 *
 * Only public collections are read, with the public web API key, so nothing private is exposed.
 * Every failure falls back to the unmodified page.
 */

const PREVIEW_PATHS = /^\/(teams|fixtures|tournaments)\/([A-Za-z0-9_-]{1,64})\/?$/;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const base = (env.BASE_PATH || '/crickethub').replace(/\/$/, '');
    if (!url.pathname.startsWith(`${base}/`) || request.method !== 'GET') return fetch(request);

    // 1. Origin first; fall back to the app shell for client-side routes
    let response = await fetch(request);
    const wantsHtml = (request.headers.get('accept') || '').includes('text/html');
    if (response.status === 404 && wantsHtml) {
      response = await fetch(new Request(`${url.origin}${base}/index.html`, request));
      response = new Response(response.body, { status: 200, headers: response.headers });
    }
    if (!(response.headers.get('content-type') || '').includes('text/html')) return response;

    // 2. Per-page preview card
    const match = url.pathname.slice(base.length).match(PREVIEW_PATHS);
    if (!match) return response;
    const card = await previewFor(match[1], match[2], env, ctx).catch(() => null);
    if (!card) return response;

    const pageUrl = `${url.origin}${url.pathname}`;
    const setContent = (selector, value) => ({ selector, value });
    const rules = [
      setContent('meta[property="og:title"]', card.title),
      setContent('meta[property="og:description"]', card.description),
      setContent('meta[name="description"]', card.description),
    ];
    let rewriter = new HTMLRewriter()
      .on('title', { element: (el) => el.setInnerContent(`${card.title} · CricketHub`) })
      .on('head', {
        element: (el) => {
          el.append(`<meta property="og:url" content="${escapeAttr(pageUrl)}" />`, { html: true });
          el.append(`<meta name="twitter:title" content="${escapeAttr(card.title)}" />`, { html: true });
          el.append(`<meta name="twitter:description" content="${escapeAttr(card.description)}" />`, { html: true });
        },
      });
    for (const rule of rules) rewriter = rewriter.on(rule.selector, { element: (el) => el.setAttribute('content', rule.value) });

    const out = rewriter.transform(response);
    const headers = new Headers(out.headers);
    headers.set('cache-control', 'public, max-age=300');
    return new Response(out.body, { status: out.status, headers });
  },
};

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** Read one public Firestore document via REST, cached at the edge for 5 minutes. */
async function readDoc(collection, id, env, ctx) {
  const api = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${collection}/${id}?key=${env.FIREBASE_API_KEY}`;
  const cache = caches.default;
  const cacheKey = new Request(api.replace(/key=[^&]+/, 'key=x'));
  let res = await cache.match(cacheKey);
  if (!res) {
    res = await fetch(api);
    if (!res.ok) return null;
    res = new Response(res.body, res);
    res.headers.set('cache-control', 'public, max-age=300');
    ctx.waitUntil(cache.put(cacheKey, res.clone()));
  }
  const json = await res.json();
  return json.fields ? decode({ mapValue: { fields: json.fields } }) : null;
}

/** Firestore REST values → plain JS. */
function decode(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return new Date(v.timestampValue);
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decode);
  if ('mapValue' in v) {
    const out = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) out[k] = decode(val);
    return out;
  }
  return null;
}

const sideName = (s) => (s && (s.name || s.placeholder)) || 'TBD';
const fmtDate = (d, tz) =>
  d.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: tz || 'UTC' });

async function previewFor(kind, id, env, ctx) {
  if (kind === 'teams') {
    const t = await readDoc('teams', id, env, ctx);
    if (!t) return null;
    return { title: t.name, description: `${t.name}${t.homeGround ? ` · ${t.homeGround}` : ''} — squad, fixtures and results on CricketHub.` };
  }
  if (kind === 'fixtures') {
    const f = await readDoc('fixtures', id, env, ctx);
    if (!f) return null;
    const title = `${sideName(f.home)} v ${sideName(f.away)}`;
    const when = f.startsAt ? fmtDate(f.startsAt, env.TIME_ZONE) : '';
    const description =
      f.status === 'completed' && f.result
        ? f.result.summary
        : f.status === 'cancelled'
          ? `Cancelled${f.cancelReason ? `: ${f.cancelReason}` : ''}`
          : `${f.matchType} · ${f.overs} overs · ${when}${f.venue ? ` · ${f.venue}` : ''}`;
    return { title: f.tournamentName ? `${title} — ${f.tournamentName}` : title, description };
  }
  const t = await readDoc('tournaments', id, env, ctx);
  if (!t) return null;
  const formats = { league: 'League', knockout: 'Knockout', groups: 'Groups + knockout' };
  return {
    title: t.name,
    description: `${formats[t.format] || 'Tournament'} · ${t.matchType} · ${t.startDate} to ${t.endDate}. Live fixtures, points table with NRR and bracket.`,
  };
}
