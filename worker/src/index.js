const ACCESS_CODE = "thudinest";
const ADMIN_ACCESS_CODE = "thudinestedit";
const MAX_IMAGES = 15;
const GITHUB_API = "https://api.github.com";
const ALLOWED_ORIGIN = "https://thudinest.com";

const THEMES = {
  retail: {
    label: "Retail", icon: "&#128717;", color: "#16a34a", dark: "#0f7a37", light: "#dcfce7",
    gallery: "Our Products", about: "About the Store",
  },
  education: {
    label: "Education", icon: "&#127891;", color: "#2563eb", dark: "#1d4ed8", light: "#dbeafe",
    gallery: "Our Campus & Programs", about: "About Us",
  },
  industry: {
    label: "Industry", icon: "&#127981;", color: "#d97706", dark: "#b45309", light: "#fef3c7",
    gallery: "Our Facility", about: "About the Company",
  },
  construction: {
    label: "Construction", icon: "&#127959;", color: "#ea580c", dark: "#c2410c", light: "#ffedd5",
    gallery: "Our Projects", about: "About Us",
  },
  automobile: {
    label: "Automobile", icon: "&#128663;", color: "#dc2626", dark: "#b91c1c", light: "#fee2e2",
    gallery: "Our Vehicles & Services", about: "About Us",
  },
  healthcare: {
    label: "Healthcare", icon: "&#127973;", color: "#0d9488", dark: "#0f766e", light: "#ccfbf1",
    gallery: "Our Facility", about: "About Us",
  },
  food: {
    label: "Food & Dining", icon: "&#127869;", color: "#e11d48", dark: "#be123c", light: "#ffe4e6",
    gallery: "Menu & Ambience", about: "Our Story",
  },
  services: {
    label: "Professional Services", icon: "&#128188;", color: "#4f46e5", dark: "#4338ca", light: "#e0e7ff",
    gallery: "Our Work", about: "About Us",
  },
  personal: {
    label: "Personal", icon: "&#128100;", color: "#a855f7", dark: "#7e22ce", light: "#f3e8ff",
    gallery: "Gallery", about: "About Me",
  },
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return withCors(new Response(null, { status: 204 }));

    const url = new URL(request.url);
    try {
      if (url.pathname === "/api/publish" && request.method === "POST") {
        return withCors(await handlePublish(request, env));
      }
      if (url.pathname === "/api/pages" && request.method === "GET") {
        return withCors(await handleListPages(url, env));
      }
      if (url.pathname === "/api/page" && request.method === "GET") {
        return withCors(await handleGetPage(url, env));
      }
      if (url.pathname === "/api/delete" && request.method === "POST") {
        return withCors(await handleDeletePage(request, env));
      }
    } catch (err) {
      return withCors(json({ ok: false, error: `Server error: ${err.message}` }, 500));
    }
    return withCors(json({ ok: false, error: "Not found" }, 404));
  },
};

function withCors(res) {
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return new Response(res.body, { status: res.status, headers });
}

function checkAdmin(url) {
  return (url.searchParams.get("code") || "").trim() === ADMIN_ACCESS_CODE;
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

async function ghListDir(env, path) {
  const res = await fetch(
    `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`,
    { headers: ghHeaders(env) }
  );
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`GitHub GET ${path} failed (${res.status})`);
  return res.json();
}

async function ghDeleteFile(env, path, sha, message) {
  const res = await fetch(
    `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`,
    {
      method: "DELETE",
      headers: ghHeaders(env),
      body: JSON.stringify({ message, sha, branch: "main" }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub DELETE ${path} failed (${res.status}): ${text}`);
  }
}

async function deleteDirRecursive(env, dirPath, message) {
  const entries = await ghListDir(env, dirPath);
  for (const entry of entries) {
    if (entry.type === "dir") {
      await deleteDirRecursive(env, entry.path, message);
    } else if (entry.type === "file") {
      await ghDeleteFile(env, entry.path, entry.sha, message);
    }
  }
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
  if (kind === "email") {
    return `<a class="act mail" href="mailto:${esc(value)}">&#9993; Email</a>`;
  }
  const digits = value.replace(/[^\d]/g, "");
  return `<a class="act wa" href="https://wa.me/${esc(digits)}" target="_blank" rel="noopener">&#128172; WhatsApp</a>`;
}

function buildContactCard(icon, label, value, href) {
  if (!value) return "";
  const inner = `<span class="c-ico">${icon}</span><span class="c-txt"><span class="c-lab">${esc(
    label
  )}</span><span class="c-val">${esc(value)}</span></span>`;
  return href
    ? `<a class="c-card" href="${href}"${href.startsWith("http") ? ' target="_blank" rel="noopener"' : ""}>${inner}</a>`
    : `<div class="c-card">${inner}</div>`;
}

function renderPage({ businessName, theme, description, phone, whatsapp, email, address, images, logo }) {
  const t = THEMES[theme] || THEMES.retail;

  const gallery =
    images.length > 0
      ? `<section class="sec">
           <h2 class="sec-title">${esc(t.gallery)}</h2>
           <div class="gallery">${images
             .map((src) => `<div class="g-item"><img src="${esc(src)}" alt="" loading="lazy"></div>`)
             .join("")}</div>
         </section>`
      : "";

  const contactCards = [
    buildContactCard("&#128222;", "Phone", phone, phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : ""),
    buildContactCard(
      "&#128172;",
      "WhatsApp",
      whatsapp,
      whatsapp ? `https://wa.me/${whatsapp.replace(/[^\d]/g, "")}` : ""
    ),
    buildContactCard("&#9993;", "Email", email, email ? `mailto:${email}` : ""),
    buildContactCard("&#128205;", "Address", address, ""),
  ]
    .filter(Boolean)
    .join("");

  const actions = [
    buildActionButton("phone", phone),
    buildActionButton("whatsapp", whatsapp),
    buildActionButton("email", email),
  ]
    .filter(Boolean)
    .join("");

  const avatar = logo
    ? `<img class="avatar" src="${esc(logo)}" alt="${esc(businessName)} logo">`
    : `<div class="avatar avatar-fallback">${t.icon}</div>`;

  const about = description
    ? `<section class="sec">
         <h2 class="sec-title">${esc(t.about)}</h2>
         <div class="about-card">${esc(description)}</div>
       </section>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(businessName)} | ThudinestHosting</title>
<meta name="description" content="${esc(description)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root { --brand: ${t.color}; --brand-dark: ${t.dark}; --brand-light: ${t.light}; }
  * { box-sizing: border-box; }
  body {
    margin: 0; font-family: 'Inter', sans-serif;
    background: radial-gradient(ellipse at 50% 0%, #1a1a3e 0%, #0a0a1a 55%);
    color: #fff; min-height: 100vh; -webkit-font-smoothing: antialiased;
  }
  .cover {
    height: 200px; position: relative; overflow: hidden;
    background:
      radial-gradient(circle at 20% 30%, ${t.color}55, transparent 55%),
      radial-gradient(circle at 80% 70%, ${t.dark}66, transparent 55%),
      linear-gradient(160deg, ${t.color}30, #0a0a1a 85%);
    background-size: 200% 200%;
    animation: drift 16s ease-in-out infinite alternate;
  }
  @keyframes drift { 0% { background-position: 0% 0%, 100% 100%, 0 0; } 100% { background-position: 20% 15%, 80% 85%, 0 0; } }
  .cover .orb {
    position: absolute; border-radius: 50%; filter: blur(40px); opacity: 0.5; pointer-events: none;
    animation: orbit 10s ease-in-out infinite;
  }
  .cover .orb1 { width: 180px; height: 180px; background: ${t.color}; top: -60px; left: 8%; }
  .cover .orb2 { width: 140px; height: 140px; background: ${t.light}; bottom: -50px; right: 12%; animation-delay: -4s; }
  @keyframes orbit {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(14px, -10px) scale(1.08); }
  }
  .cover .watermark {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%,-55%) rotate(-8deg);
    font-size: 9rem; opacity: 0.08; pointer-events: none; line-height: 1;
  }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 10px 40px rgba(0,0,0,0.5), 0 0 0 6px ${t.color}22; }
    50% { box-shadow: 0 10px 46px rgba(0,0,0,0.55), 0 0 0 10px ${t.color}33; }
  }
  .profile { max-width: 780px; margin: -64px auto 0; padding: 0 24px; text-align: center; position: relative; z-index: 2; }
  .avatar {
    width: 148px; height: 148px; border-radius: 50%; object-fit: cover;
    border: 5px solid #0a0a1a; outline: 2px solid ${t.color}aa;
    display: block; margin: 0 auto;
    animation: fadeUp 0.6s ease both, glowPulse 4s ease-in-out infinite 0.6s;
  }
  .avatar-fallback {
    display: flex; align-items: center; justify-content: center; font-size: 3.6rem;
    background: linear-gradient(160deg, ${t.color}, ${t.dark});
  }
  h1.name {
    margin: 22px 0 0; font-family: 'Space Grotesk', sans-serif; font-weight: 800;
    font-size: clamp(1.9rem, 5.5vw, 2.9rem); letter-spacing: -0.02em;
    background: linear-gradient(100deg, #fff 30%, ${t.light});
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
    text-shadow: 0 0 30px ${t.color}55;
    animation: fadeUp 0.6s ease 0.1s both;
  }
  .actions {
    display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin: 26px 0 8px;
    animation: fadeUp 0.6s ease 0.2s both;
  }
  .act {
    display: inline-flex; align-items: center; gap: 7px; border-radius: 999px; padding: 13px 24px;
    font-size: 0.93rem; font-weight: 700; text-decoration: none; transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .act:hover { transform: translateY(-3px); }
  .act.call { background: ${t.color}; color: #fff; box-shadow: 0 6px 24px ${t.color}55; }
  .act.wa { background: #25D366; color: #fff; box-shadow: 0 6px 24px #25D36655; }
  .act.mail { background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); }
  main { max-width: 780px; margin: 0 auto; padding: 52px 24px 24px; }
  .sec { margin-bottom: 36px; animation: fadeUp 0.6s ease both; }
  .sec:nth-of-type(1) { animation-delay: 0.15s; }
  .sec:nth-of-type(2) { animation-delay: 0.25s; }
  .sec:nth-of-type(3) { animation-delay: 0.35s; }
  .sec-title {
    font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 1.3rem; margin: 0 0 18px;
    display: flex; align-items: center; gap: 10px; justify-content: center;
  }
  .sec-title::before { content: ""; width: 4px; height: 20px; background: ${t.color}; border-radius: 2px; display: inline-block; }
  .about-card {
    border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 28px 30px;
    background: rgba(255,255,255,0.035); backdrop-filter: blur(12px);
    font-size: 1.05rem; line-height: 1.75; color: rgba(255,255,255,0.85);
    text-align: center;
  }
  .gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; }
  .g-item {
    border-radius: 18px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);
    aspect-ratio: 1; position: relative;
  }
  .g-item img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease; display: block; }
  .g-item:hover img { transform: scale(1.08); }
  .contact-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
  .c-card {
    display: flex; align-items: center; gap: 14px; text-decoration: none; color: inherit;
    border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 16px 18px;
    background: rgba(255,255,255,0.035); backdrop-filter: blur(12px);
    transition: transform 0.2s ease, border-color 0.2s ease;
  }
  a.c-card:hover { transform: translateY(-2px); border-color: ${t.color}77; }
  .c-ico {
    width: 42px; height: 42px; border-radius: 12px; flex: none; font-size: 1.2rem;
    display: flex; align-items: center; justify-content: center;
    background: ${t.color}26; border: 1px solid ${t.color}44;
  }
  .c-txt { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .c-lab { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.45); }
  .c-val { font-size: 0.98rem; font-weight: 600; overflow-wrap: anywhere; }
  footer { text-align: center; padding: 36px 24px 44px; font-size: 0.8rem; color: rgba(255,255,255,0.35); }
  footer a { color: ${t.light}; font-weight: 600; text-decoration: none; }
</style>
</head>
<body>
  <div class="cover">
    <span class="orb orb1"></span>
    <span class="orb orb2"></span>
    <span class="watermark">${t.icon}</span>
  </div>
  <div class="profile">
    ${avatar}
    <h1 class="name">${esc(businessName)}</h1>
    <div class="actions">${actions}</div>
  </div>
  <main>
    ${about}
    ${gallery}
    <section class="sec">
      <h2 class="sec-title">Get in Touch</h2>
      <div class="contact-grid">${contactCards}</div>
    </section>
  </main>
  <footer>Powered by <a href="/">ThudinestHosting</a></footer>
</body>
</html>
`;
}

async function handleListPages(url, env) {
  if (!checkAdmin(url)) return json({ ok: false, error: "Invalid admin code." }, 401);

  const entries = await ghListDir(env, "p");
  const dirs = entries.filter((e) => e.type === "dir");

  const pages = await Promise.all(
    dirs.map(async (dir) => {
      const metaFile = await ghGetFile(env, `p/${dir.name}/meta.json`);
      if (!metaFile) return { slug: dir.name, businessName: null, theme: null, updatedAt: null };
      const meta = JSON.parse(base64ToUtf8(metaFile.content));
      return {
        slug: dir.name,
        businessName: meta.businessName || null,
        theme: meta.theme || null,
        updatedAt: meta.updated_at || null,
      };
    })
  );

  pages.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  return json({ ok: true, pages });
}

async function handleGetPage(url, env) {
  if (!checkAdmin(url)) return json({ ok: false, error: "Invalid admin code." }, 401);

  const slug = (url.searchParams.get("slug") || "").trim().toLowerCase();
  if (!slug) return json({ ok: false, error: "Missing slug." }, 400);

  const metaFile = await ghGetFile(env, `p/${slug}/meta.json`);
  if (!metaFile) return json({ ok: false, error: `No page found for "${slug}".` }, 404);

  const meta = JSON.parse(base64ToUtf8(metaFile.content));
  return json({
    ok: true,
    page: {
      slug,
      businessName: meta.businessName || "",
      theme: meta.theme || "retail",
      description: meta.description || "",
      phone: meta.phone || "",
      whatsapp: meta.whatsapp || "",
      email: meta.email || "",
      address: meta.address || "",
      images: meta.images || [],
      logo: meta.logo || null,
    },
  });
}

async function handleDeletePage(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  if (String(body.adminCode || "").trim() !== ADMIN_ACCESS_CODE) {
    return json({ ok: false, error: "Invalid admin code." }, 401);
  }

  const slug = String(body.slug || "").trim().toLowerCase();
  if (!slug) return json({ ok: false, error: "Missing slug." }, 400);

  const dirPath = `p/${slug}`;
  const entries = await ghListDir(env, dirPath);
  if (entries.length === 0) {
    return json({ ok: false, error: `No page found for "${slug}".` }, 404);
  }

  await deleteDirRecursive(env, dirPath, `Delete page: ${slug}`);
  return json({ ok: true });
}

async function handlePublish(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  const isAdmin = String(body.adminCode || "").trim() === ADMIN_ACCESS_CODE;
  const accessCode = String(body.accessCode || "").trim().toLowerCase();
  if (!isAdmin && accessCode !== ACCESS_CODE) {
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
  const images = Array.isArray(body.images) ? body.images.slice(0, MAX_IMAGES) : [];

  const metaPath = `p/${slug}/meta.json`;
  const existingMetaFile = await ghGetFile(env, metaPath);

  let editKey = String(body.editKey || "").trim();
  let editKeyHash;
  let metaSha;
  let returnedEditKey = null;

  if (existingMetaFile) {
    metaSha = existingMetaFile.sha;
    const existingMeta = JSON.parse(base64ToUtf8(existingMetaFile.content));
    if (!isAdmin) {
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
    }
    editKeyHash = existingMeta.edit_key_hash;
  } else {
    editKey = crypto.randomUUID();
    editKeyHash = await sha256Hex(editKey);
    returnedEditKey = editKey;
  }

  const imagePaths = [];
  for (let i = 0; i < images.length; i++) {
    const item = images[i];
    if (item && item.keep) {
      imagePaths.push(item.keep);
      continue;
    }
    const dataUrl = item && item.dataUrl;
    const match = /^data:image\/(\w+);base64,(.+)$/.exec(dataUrl || "");
    if (!match) continue;
    const ext = match[1] === "jpeg" ? "jpg" : match[1];
    const base64 = match[2];
    const path = `p/${slug}/images/image-new-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    await ghPutFile(env, path, base64, `Publish page: ${slug} (image)`);
    imagePaths.push(path.replace(`p/${slug}/`, ""));
  }

  let logoPath = null;
  if (body.logo && body.logo.keep) {
    logoPath = body.logo.keep;
  } else if (body.logo && body.logo.dataUrl) {
    const logoMatch = /^data:image\/(\w+);base64,(.+)$/.exec(body.logo.dataUrl);
    if (logoMatch) {
      const ext = logoMatch[1] === "jpeg" ? "jpg" : logoMatch[1];
      const base64 = logoMatch[2];
      const path = `p/${slug}/logo.${ext}`;
      const existing = await ghGetFile(env, path);
      await ghPutFile(env, path, base64, `Publish page: ${slug} (logo)`, existing ? existing.sha : undefined);
      logoPath = `logo.${ext}`;
    }
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
    logo: logoPath,
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

  const meta = {
    edit_key_hash: editKeyHash,
    updated_at: new Date().toISOString(),
    businessName,
    theme: themeKey,
    description,
    phone,
    whatsapp,
    email,
    address,
    images: imagePaths,
    logo: logoPath,
  };
  await ghPutFile(env, metaPath, utf8ToBase64(JSON.stringify(meta, null, 2)), `Publish page: ${slug} (meta)`, metaSha);

  const pagesBaseUrl = env.PAGES_BASE_URL || "https://thudinest.com";
  const result = { ok: true, url: `${pagesBaseUrl}/p/${slug}/` };
  if (returnedEditKey) result.editKey = returnedEditKey;
  return json(result, 200);
}
