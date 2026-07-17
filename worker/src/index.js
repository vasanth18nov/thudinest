const ACCESS_CODE = "thudinest";
const ADMIN_ACCESS_CODE = "thudinestedit";
const MAX_IMAGES = 15;
const GITHUB_API = "https://api.github.com";
const ALLOWED_ORIGIN = "https://thudinest.com";

const SURVEY_TTL_SECONDS = 60 * 24 * 60 * 60; // 60 days
const MAX_QUESTIONS = 10;
const MAX_OPTIONS = 8;
const MAX_RESPONSES_LISTED = 1000;

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

const SOCIAL_PLATFORMS = {
  instagram: {
    label: "Instagram",
    domain: "instagram.com",
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none"/></svg>',
  },
  facebook: {
    label: "Facebook",
    domain: "facebook.com",
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-8h2.7l.4-3.1h-3.1V8c0-.9.25-1.5 1.55-1.5H17V3.6C16.7 3.55 15.7 3.5 14.5 3.5c-2.5 0-4.2 1.5-4.2 4.3v2.1H7.6V13h2.7v8h3.2Z"/></svg>',
  },
  linkedin: {
    label: "LinkedIn",
    domain: "linkedin.com/in",
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM20.5 20h-3.37v-6.06c0-1.44-.03-3.3-2.02-3.3-2.02 0-2.33 1.58-2.33 3.2V20H9.4V8.5h3.24v1.57h.05c.45-.85 1.56-1.75 3.2-1.75 3.43 0 4.06 2.26 4.06 5.2V20Z"/></svg>',
  },
  twitter: {
    label: "X (Twitter)",
    domain: "twitter.com",
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 4l16 16M20 4L4 20"/></svg>',
  },
  youtube: {
    label: "YouTube",
    domain: "youtube.com",
    handlePrefix: "@",
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 8.7v6.6l6-3.3-6-3.3Z" fill="currentColor" stroke="none"/></svg>',
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
      if (url.pathname === "/api/survey/create" && request.method === "POST") {
        return withCors(await handleSurveyCreate(request, env));
      }
      if (url.pathname === "/api/survey/def" && request.method === "GET") {
        return withCors(await handleSurveyDef(url, env));
      }
      if (url.pathname === "/api/survey/respond" && request.method === "POST") {
        return withCors(await handleSurveyRespond(request, env));
      }
      if (url.pathname === "/api/survey/results" && request.method === "GET") {
        return withCors(await handleSurveyResults(url, env));
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

const WORDCLOUD_STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "your", "with", "this", "that", "from", "have",
  "has", "had", "was", "were", "will", "would", "can", "could", "should", "our", "their", "its",
  "a", "an", "of", "in", "on", "at", "to", "is", "as", "by", "or", "we", "us", "i", "be", "been",
  "being", "all", "any", "also", "more", "most", "some", "such", "no", "nor", "only", "own",
  "same", "so", "than", "too", "very", "just", "into", "about", "over", "under", "then", "once",
  "here", "there", "when", "where", "why", "how", "what", "which", "who", "whom", "get", "one",
]);

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h >>> 0;
}

function seededRandom(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rectsOverlap(a, b) {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
}

function extractTopWords(text, limit) {
  const counts = new Map();
  const words = String(text || "").toLowerCase().match(/[a-z']+/g) || [];
  for (const w of words) {
    if (w.length < 3 || WORDCLOUD_STOPWORDS.has(w)) continue;
    counts.set(w, (counts.get(w) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function buildWordCloudSvg(text, theme) {
  const words = extractTopWords(text, 40);
  if (words.length < 4) return null;

  const W = 1400;
  const H = 320;
  const rand = seededRandom(hashString(text));
  const maxCount = words[0][1];
  const palette = [
    theme.color,
    theme.light,
    "#ffffff",
    theme.dark,
    "#f5c842",
    "#22d3ee",
    "#ec4899",
    "#84cc16",
  ];
  const placed = [];
  const items = [];

  function tryPlace(word, fontSize, packFactor) {
    const approxW = word.length * fontSize * 0.56 * packFactor;
    const approxH = fontSize * 1.05 * packFactor;
    const cx = W / 2;
    const cy = H / 2;
    let angle = rand() * Math.PI * 2;
    let radius = 0;

    for (let tries = 0; tries < 320; tries++) {
      const x = cx + Math.cos(angle) * radius - approxW / 2;
      const y = cy + Math.sin(angle) * radius * 0.55 - approxH / 2;
      const box = { x, y, w: approxW, h: approxH };
      if (
        x >= 6 &&
        y >= 6 &&
        x + approxW <= W - 6 &&
        y + approxH <= H - 6 &&
        !placed.some((p) => rectsOverlap(p, box))
      ) {
        placed.push(box);
        return { x: x + approxW / 2, y: y + approxH * 0.72 };
      }
      angle += 0.32;
      radius += 3;
    }
    return null;
  }

  const overflow = [];

  words.forEach(([word, count], i) => {
    // Blend frequency with rank so same-frequency words (common in short text)
    // still get visual size variety instead of all rendering at max size.
    const freqRatio = count / maxCount;
    const rankRatio = 1 - i / words.length;
    const sizeRatio = freqRatio * 0.55 + rankRatio * 0.45;
    const fontSize = Math.round(20 + sizeRatio * 48);

    const pos = tryPlace(word, fontSize, 1);
    if (!pos) {
      overflow.push([word, fontSize]);
      return;
    }

    const color = palette[Math.floor(rand() * palette.length)];
    const opacity = Math.min(0.92, 0.45 + sizeRatio * 0.47).toFixed(2);
    const rotate = i % 4 === 0 ? (rand() > 0.5 ? -8 : 8) : 0;
    const tx = pos.x.toFixed(1);
    const ty = pos.y.toFixed(1);
    items.push(
      `<text x="${tx}" y="${ty}" font-size="${fontSize}" font-family="'Space Grotesk', sans-serif" font-weight="700" fill="${color}" fill-opacity="${opacity}" text-anchor="middle"${
        rotate ? ` transform="rotate(${rotate} ${tx} ${ty})"` : ""
      }>${esc(word)}</text>`
    );
  });

  // Fill pass: retry anything that didn't fit, shrunk down, to pack the
  // canvas tighter instead of leaving gaps.
  overflow.forEach(([word, fontSize]) => {
    const smallSize = Math.max(14, Math.round(fontSize * 0.6));
    const pos = tryPlace(word, smallSize, 0.92);
    if (!pos) return;
    const color = palette[Math.floor(rand() * palette.length)];
    const tx = pos.x.toFixed(1);
    const ty = pos.y.toFixed(1);
    items.push(
      `<text x="${tx}" y="${ty}" font-size="${smallSize}" font-family="'Space Grotesk', sans-serif" font-weight="700" fill="${color}" fill-opacity="0.4" text-anchor="middle">${esc(
        word
      )}</text>`
    );
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="#000000"/>
${items.join("\n")}
</svg>`;
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

function normalizeSocialUrl(platform, value) {
  let v = String(value || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (/^www\./i.test(v)) return `https://${v}`;
  const domainRoot = platform.domain.split("/")[0];
  if (v.toLowerCase().includes(domainRoot)) {
    return `https://${v.replace(/^\/+/, "")}`;
  }
  // Bare handle (e.g. "@name" or "name") -> build the platform's default profile URL.
  v = v.replace(/^@/, "").replace(/^\/+/, "");
  const prefix = platform.handlePrefix || "";
  return `https://${platform.domain}/${prefix}${v}`;
}

function buildSocialLink(key, value) {
  const platform = SOCIAL_PLATFORMS[key];
  if (!platform) return "";
  const url = normalizeSocialUrl(platform, value);
  if (!url) return "";
  return `<a class="social-ico" href="${esc(url)}" target="_blank" rel="noopener" aria-label="${esc(
    platform.label
  )}" title="${esc(platform.label)}">${platform.svg}</a>`;
}

function renderPage({
  businessName,
  theme,
  description,
  phone,
  whatsapp,
  email,
  address,
  images,
  logo,
  social,
  cloud,
  pageUrl,
}) {
  const t = THEMES[theme] || THEMES.retail;
  const s = social || {};

  const socialLinks = Object.keys(SOCIAL_PLATFORMS)
    .map((key) => buildSocialLink(key, s[key]))
    .filter(Boolean)
    .join("");

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(
    pageUrl || ""
  )}`;

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
  .cover.has-cloud {
    background:
      linear-gradient(rgba(8,8,20,0.62), rgba(8,8,20,0.62)),
      url('cloud.svg') center / cover no-repeat;
    animation: none;
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
  .social-row {
    display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin: 18px 0 4px;
    animation: fadeUp 0.6s ease 0.3s both;
  }
  .social-ico {
    width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    color: rgba(255,255,255,0.75); background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15);
    transition: transform 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  }
  .social-ico svg { width: 19px; height: 19px; }
  .social-ico:hover { color: #fff; border-color: ${t.color}88; transform: translateY(-2px); }
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
  .qr-card {
    display: flex; flex-direction: column; align-items: center; gap: 12px;
    border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 26px;
    background: rgba(255,255,255,0.035); backdrop-filter: blur(12px);
  }
  .qr-card img { border-radius: 12px; background: #fff; padding: 10px; }
  .qr-url { margin: 0; font-size: 0.85rem; color: rgba(255,255,255,0.55); overflow-wrap: anywhere; text-align: center; }
  footer { text-align: center; padding: 36px 24px 44px; font-size: 0.8rem; color: rgba(255,255,255,0.35); }
  footer a { color: ${t.light}; font-weight: 600; text-decoration: none; }
</style>
</head>
<body>
  <div class="cover${cloud ? " has-cloud" : ""}">
    ${
      cloud
        ? ""
        : `<span class="orb orb1"></span><span class="orb orb2"></span><span class="watermark">${t.icon}</span>`
    }
  </div>
  <div class="profile">
    ${avatar}
    <h1 class="name">${esc(businessName)}</h1>
    <div class="actions">${actions}</div>
    ${socialLinks ? `<div class="social-row">${socialLinks}</div>` : ""}
  </div>
  <main>
    ${about}
    ${gallery}
    <section class="sec">
      <h2 class="sec-title">Get in Touch</h2>
      <div class="contact-grid">${contactCards}</div>
    </section>
    ${
      pageUrl
        ? `<section class="sec">
      <h2 class="sec-title">Scan to View on Mobile</h2>
      <div class="qr-card">
        <img src="${esc(qrUrl)}" alt="QR code for this page" width="160" height="160" loading="lazy">
        <p class="qr-url">${esc(pageUrl)}</p>
      </div>
    </section>`
        : ""
    }
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
      social: meta.social || {},
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

  const social = {};
  for (const key of Object.keys(SOCIAL_PLATFORMS)) {
    const value = String((body.social && body.social[key]) || "").trim();
    if (value) social[key] = value;
  }

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

  let cloudPath = null;
  const cloudSvg = buildWordCloudSvg(description, THEMES[themeKey]);
  if (cloudSvg) {
    const path = `p/${slug}/cloud.svg`;
    const existingCloud = await ghGetFile(env, path);
    await ghPutFile(
      env,
      path,
      utf8ToBase64(cloudSvg),
      `Publish page: ${slug} (word cloud)`,
      existingCloud ? existingCloud.sha : undefined
    );
    cloudPath = "cloud.svg";
  }

  const pagesBaseUrl = env.PAGES_BASE_URL || "https://thudinest.com";
  const pageUrl = `${pagesBaseUrl}/p/${slug}/`;

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
    social,
    cloud: cloudPath,
    pageUrl,
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
    social,
    cloud: cloudPath,
  };
  await ghPutFile(env, metaPath, utf8ToBase64(JSON.stringify(meta, null, 2)), `Publish page: ${slug} (meta)`, metaSha);

  const result = { ok: true, url: pageUrl };
  if (returnedEditKey) result.editKey = returnedEditKey;
  return json(result, 200);
}

function randomId(len) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

async function handleSurveyCreate(request, env) {
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

  const title = String(body.title || "").trim();
  if (!title) return json({ ok: false, error: "Survey title is required." }, 400);

  const rawQuestions = Array.isArray(body.questions) ? body.questions.slice(0, MAX_QUESTIONS) : [];
  if (rawQuestions.length === 0) {
    return json({ ok: false, error: "Add at least one question." }, 400);
  }

  const questions = [];
  for (let i = 0; i < rawQuestions.length; i++) {
    const q = rawQuestions[i];
    const prompt = String((q && q.prompt) || "").trim();
    if (!prompt) return json({ ok: false, error: `Question ${i + 1} needs a prompt.` }, 400);
    const type = q && q.type === "choice" ? "choice" : "text";
    const question = { id: `q${i + 1}`, type, prompt };
    if (type === "choice") {
      const options = (Array.isArray(q.options) ? q.options : [])
        .map((o) => String(o || "").trim())
        .filter(Boolean)
        .slice(0, MAX_OPTIONS);
      if (options.length < 2) {
        return json({ ok: false, error: `Question ${i + 1} needs at least 2 options.` }, 400);
      }
      question.options = options;
    }
    questions.push(question);
  }

  let surveyId;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = randomId(6);
    const existing = await env.SURVEYS.get(`survey:${candidate}:def`);
    if (!existing) {
      surveyId = candidate;
      break;
    }
  }
  if (!surveyId) return json({ ok: false, error: "Couldn't generate a survey ID, try again." }, 500);

  const hostKey = crypto.randomUUID();
  const hostKeyHash = await sha256Hex(hostKey);

  const def = {
    title,
    questions,
    hostKeyHash,
    createdAt: new Date().toISOString(),
  };

  await env.SURVEYS.put(`survey:${surveyId}:def`, JSON.stringify(def), {
    expirationTtl: SURVEY_TTL_SECONDS,
  });

  const base = env.PAGES_BASE_URL || "https://thudinest.com";
  return json(
    {
      ok: true,
      surveyId,
      hostKey,
      participantUrl: `${base}/survey/?id=${surveyId}`,
      resultsUrl: `${base}/survey/results/?id=${surveyId}&key=${hostKey}`,
    },
    200
  );
}

async function handleSurveyDef(url, env) {
  const id = (url.searchParams.get("id") || "").trim().toLowerCase();
  if (!id) return json({ ok: false, error: "Missing survey id." }, 400);

  const raw = await env.SURVEYS.get(`survey:${id}:def`);
  if (!raw) return json({ ok: false, error: "Survey not found." }, 404);

  const def = JSON.parse(raw);
  return json({ ok: true, title: def.title, questions: def.questions });
}

async function handleSurveyRespond(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  const id = String(body.id || "").trim().toLowerCase();
  if (!id) return json({ ok: false, error: "Missing survey id." }, 400);

  const raw = await env.SURVEYS.get(`survey:${id}:def`);
  if (!raw) return json({ ok: false, error: "Survey not found." }, 404);
  const def = JSON.parse(raw);

  const submitted = body.answers && typeof body.answers === "object" ? body.answers : {};
  const answers = {};
  for (const q of def.questions) {
    const value = submitted[q.id];
    if (q.type === "choice") {
      const text = String(value || "").trim();
      if (q.options.includes(text)) answers[q.id] = text;
    } else {
      const text = String(value || "").trim().slice(0, 500);
      if (text) answers[q.id] = text;
    }
  }

  if (Object.keys(answers).length === 0) {
    return json({ ok: false, error: "No answers to submit." }, 400);
  }

  const responseId = crypto.randomUUID();
  await env.SURVEYS.put(
    `survey:${id}:resp:${responseId}`,
    JSON.stringify({ answers, submittedAt: new Date().toISOString() }),
    { expirationTtl: SURVEY_TTL_SECONDS }
  );

  return json({ ok: true }, 200);
}

async function handleSurveyResults(url, env) {
  const id = (url.searchParams.get("id") || "").trim().toLowerCase();
  const key = (url.searchParams.get("key") || "").trim();
  if (!id || !key) return json({ ok: false, error: "Missing survey id or key." }, 400);

  const rawDef = await env.SURVEYS.get(`survey:${id}:def`);
  if (!rawDef) return json({ ok: false, error: "Survey not found." }, 404);
  const def = JSON.parse(rawDef);

  const keyHash = await sha256Hex(key);
  if (keyHash !== def.hostKeyHash) {
    return json({ ok: false, error: "Invalid results key." }, 401);
  }

  const list = await env.SURVEYS.list({ prefix: `survey:${id}:resp:`, limit: MAX_RESPONSES_LISTED });
  const responses = await Promise.all(list.keys.map((k) => env.SURVEYS.get(k.name)));

  const tallies = {};
  const textAnswers = {};
  for (const q of def.questions) {
    if (q.type === "choice") {
      tallies[q.id] = {};
      for (const opt of q.options) tallies[q.id][opt] = 0;
    } else {
      textAnswers[q.id] = [];
    }
  }

  let responseCount = 0;
  for (const raw of responses) {
    if (!raw) continue;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    responseCount++;
    for (const q of def.questions) {
      const value = parsed.answers && parsed.answers[q.id];
      if (!value) continue;
      if (q.type === "choice" && tallies[q.id] && value in tallies[q.id]) {
        tallies[q.id][value]++;
      } else if (q.type === "text") {
        textAnswers[q.id].push(value);
      }
    }
  }

  return json({
    ok: true,
    title: def.title,
    questions: def.questions,
    responseCount,
    tallies,
    textAnswers,
  });
}
