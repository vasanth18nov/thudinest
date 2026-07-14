const ACCESS_CODE = "thudinest";
const GITHUB_API = "https://api.github.com";
const ALLOWED_ORIGIN = "https://thudinest.com";

const THEMES = {
  retail: { label: "Retail", color: "#16a34a", dark: "#0f7a37", light: "#dcfce7" },
  education: { label: "Education", color: "#2563eb", dark: "#1d4ed8", light: "#dbeafe" },
  industry: { label: "Industry", color: "#d97706", dark: "#b45309", light: "#fef3c7" },
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return withCors(new Response(null, { status: 204 }));

    const url = new URL(request.url);
    if (url.pathname === "/api/publish" && request.method === "POST") {
      try {
        return withCors(await handlePublish(request, env));
      } catch (err) {
        return withCors(json({ ok: false, error: `Server error: ${err.message}` }, 500));
      }
    }
    return withCors(json({ ok: false, error: "Not found" }, 404));
  },
};

function withCors(res) {
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return new Response(res.body, { status: res.status, headers });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function esc(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

async function sha256Hex(str) {
  const data = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function base64ToUtf8(b64) {
  const binary = atob(b64.replace(/\n/g, ""));
  const bytes = new Uint8Array([...binary].map((c) => c.charCodeAt(0)));
  return new TextDecoder().decode(bytes);
}

function ghHeaders(env) {
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    "User-Agent": "thudinesthosting-worker",
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };
}

async function ghGetFile(env, path) {
  const res = await fetch(
    `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`,
    { headers: ghHeaders(env) }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub GET ${path} failed (${res.status})`);
  return res.json();
}

async function ghPutFile(env, path, base64Content, message, sha) {
  const body = { message, content: base64Content, branch: "main" };
  if (sha) body.sha = sha;
  const res = await fetch(
    `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`,
    { method: "PUT", headers: ghHeaders(env), body: JSON.stringify(body) }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub PUT ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

function buildActionButton(kind, value) {
  if (!value) return "";
  if (kind === "phone") {
    const tel = value.replace(/[^\d+]/g, "");
    return `<a class="act call" href="tel:${esc(tel)}">&#128222; Call</a>`;
  }
  const digits = value.replace(/[^\d]/g, "");
  return `<a class="act wa" href="https://wa.me/${esc(digits)}" target="_blank" rel="noopener">&#128172; WhatsApp</a>`;
}

function buildInfoRow(label, value) {
  if (!value) return "";
  return `<dt>${esc(label)}</dt><dd>${esc(value)}</dd>`;
}

function renderPage({ businessName, theme, description, phone, whatsapp, email, address, images }) {
  const t = THEMES[theme] || THEMES.retail;
  const gallery =
    images.length > 0
      ? `<div class="gallery">${images
          .map((src) => `<img src="${esc(src)}" alt="" loading="lazy">`)
          .join("")}</div>`
      : "";
  const infoRows = [
    buildInfoRow("Phone", phone),
    buildInfoRow("WhatsApp", whatsapp),
    buildInfoRow("Email", email),
    buildInfoRow("Address", address),
  ]
    .filter(Boolean)
    .join("");
  const actions = [buildActionButton("phone", phone), buildActionButton("whatsapp", whatsapp)]
    .filter(Boolean)
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(businessName)} | ThudinestHosting</title>
<meta name="description" content="${esc(description)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --brand: ${t.color}; --brand-dark: ${t.dark}; --brand-light: ${t.light};
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; font-family: 'Inter', sans-serif;
    background: radial-gradient(ellipse at 50% 0%, #1a1a3e 0%, #0a0a1a 60%);
    color: #fff; min-height: 100vh;
  }
  .hero {
    padding: 64px 24px 48px; text-align: center; position: relative; overflow: hidden;
    background: linear-gradient(160deg, ${t.color}33, transparent 60%);
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .hero .badge {
    display: inline-block; text-transform: uppercase; letter-spacing: 0.2em; font-size: 11px;
    font-weight: 700; background: ${t.color}2e; color: ${t.light}; border: 1px solid ${t.color}66;
    border-radius: 999px; padding: 6px 16px; margin-bottom: 18px;
  }
  .hero h1 {
    margin: 0; font-family: 'Space Grotesk', sans-serif; font-size: clamp(1.8rem, 5vw, 2.6rem);
    font-weight: 700; letter-spacing: -0.02em;
  }
  .hero p.tagline { margin: 14px auto 0; max-width: 34rem; opacity: 0.75; font-size: 1.05rem; line-height: 1.65; }
  .actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 26px; }
  .act {
    display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 12px 22px;
    font-size: 0.92rem; font-weight: 600; text-decoration: none; transition: transform 0.2s ease;
  }
  .act:hover { transform: translateY(-2px); }
  .act.call { background: ${t.color}; color: #fff; }
  .act.wa { background: #25D366; color: #fff; }
  main { max-width: 780px; margin: 0 auto; padding: 44px 24px 24px; }
  .gallery {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 32px;
  }
  .gallery img {
    width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);
  }
  .info {
    border: 1px solid rgba(255,255,255,0.1); border-radius: 18px; padding: 26px 28px;
    background: rgba(255,255,255,0.04); backdrop-filter: blur(10px); margin-bottom: 24px;
  }
  .info h2 { margin: 0 0 14px; font-family: 'Space Grotesk', sans-serif; font-size: 1.15rem; }
  .info dl { margin: 0; }
  .info dt {
    font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.45);
    margin-top: 14px;
  }
  .info dt:first-child { margin-top: 0; }
  .info dd { margin: 3px 0 0; font-size: 1rem; color: rgba(255,255,255,0.92); }
  footer {
    text-align: center; padding: 32px 24px; font-size: 0.8rem; color: rgba(255,255,255,0.35);
  }
  footer a { color: ${t.light}; font-weight: 600; text-decoration: none; }
</style>
</head>
<body>
  <div class="hero">
    <span class="badge">${esc(t.label)}</span>
    <h1>${esc(businessName)}</h1>
    <p class="tagline">${esc(description)}</p>
    <div class="actions">${actions}</div>
  </div>
  <main>
    ${gallery}
    <div class="info">
      <h2>Contact</h2>
      <dl>${infoRows}</dl>
    </div>
  </main>
  <footer>Powered by <a href="/">ThudinestHosting</a></footer>
</body>
</html>
`;
}

async function handlePublish(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  const accessCode = String(body.accessCode || "").trim().toLowerCase();
  if (accessCode !== ACCESS_CODE) {
    return json({ ok: false, error: "Invalid access code." }, 400);
  }

  const slug = String(body.slug || "").trim().toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return json(
      { ok: false, error: "Invalid page URL. Use lowercase letters, numbers and hyphens only (e.g. fresh-grocer)." },
      400
    );
  }

  const businessName = String(body.businessName || "").trim();
  if (!businessName) return json({ ok: false, error: "Business name is required." }, 400);

  const themeKey = THEMES[body.theme] ? body.theme : "retail";
  const description = String(body.description || "").trim();
  const phone = String(body.phone || "").trim();
  const whatsapp = String(body.whatsapp || "").trim();
  const email = String(body.email || "").trim();
  const address = String(body.address || "").trim();
  const images = Array.isArray(body.images) ? body.images.slice(0, 6) : [];

  const metaPath = `p/${slug}/meta.json`;
  const existingMetaFile = await ghGetFile(env, metaPath);

  let editKey = String(body.editKey || "").trim();
  let editKeyHash;
  let metaSha;
  let returnedEditKey = null;

  if (existingMetaFile) {
    metaSha = existingMetaFile.sha;
    const existingMeta = JSON.parse(base64ToUtf8(existingMetaFile.content));
    const providedHash = editKey ? await sha256Hex(editKey) : null;
    if (!editKey || providedHash !== existingMeta.edit_key_hash) {
      return json(
        {
          ok: false,
          error: `The page URL "${slug}" is already taken. If it's yours, enter the edit key you saved when you first published it.`,
        },
        409
      );
    }
    editKeyHash = existingMeta.edit_key_hash;
  } else {
    editKey = crypto.randomUUID();
    editKeyHash = await sha256Hex(editKey);
    returnedEditKey = editKey;
  }

  const imagePaths = [];
  for (let i = 0; i < images.length; i++) {
    const dataUrl = images[i] && images[i].dataUrl;
    const match = /^data:image\/(\w+);base64,(.+)$/.exec(dataUrl || "");
    if (!match) continue;
    const ext = match[1] === "jpeg" ? "jpg" : match[1];
    const base64 = match[2];
    const path = `p/${slug}/images/image-${i}.${ext}`;
    const existing = await ghGetFile(env, path);
    await ghPutFile(env, path, base64, `Publish page: ${slug} (image ${i})`, existing ? existing.sha : undefined);
    imagePaths.push(`images/image-${i}.${ext}`);
  }

  const html = renderPage({
    businessName,
    theme: themeKey,
    description,
    phone,
    whatsapp,
    email,
    address,
    images: imagePaths,
  });
  const indexPath = `p/${slug}/index.html`;
  const existingIndex = await ghGetFile(env, indexPath);
  await ghPutFile(
    env,
    indexPath,
    utf8ToBase64(html),
    `Publish page: ${slug}`,
    existingIndex ? existingIndex.sha : undefined
  );

  const meta = { edit_key_hash: editKeyHash, updated_at: new Date().toISOString() };
  await ghPutFile(env, metaPath, utf8ToBase64(JSON.stringify(meta, null, 2)), `Publish page: ${slug} (meta)`, metaSha);

  const pagesBaseUrl = env.PAGES_BASE_URL || "https://thudinest.com";
  const result = { ok: true, url: `${pagesBaseUrl}/p/${slug}/` };
  if (returnedEditKey) result.editKey = returnedEditKey;
  return json(result, 200);
}
