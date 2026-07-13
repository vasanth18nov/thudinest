#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..");
const ACCESS_CODE = "thudinest";

const THEMES = {
  retail: { label: "Retail", color: "#16a34a", dark: "#15803d", light: "#dcfce7" },
  education: { label: "Education", color: "#2563eb", dark: "#1d4ed8", light: "#dbeafe" },
  industry: { label: "Industry", color: "#d97706", dark: "#b45309", light: "#fef3c7" },
};

function esc(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

function parseIssueBody(body) {
  const parts = ("\n" + body).split(/\n### /).filter(Boolean);
  const fields = {};
  for (const raw of parts) {
    const newlineIdx = raw.indexOf("\n");
    if (newlineIdx === -1) continue;
    const label = raw.slice(0, newlineIdx).trim();
    let value = raw.slice(newlineIdx + 1).trim();
    if (value === "_No response_") value = "";
    fields[label] = value;
  }
  return fields;
}

function setOutput(name, value) {
  const outFile = process.env.GITHUB_OUTPUT;
  if (!outFile) return;
  if (value.includes("\n")) {
    const delim = "EOF_" + Math.random().toString(36).slice(2);
    fs.appendFileSync(outFile, `${name}<<${delim}\n${value}\n${delim}\n`);
  } else {
    fs.appendFileSync(outFile, `${name}=${value}\n`);
  }
}

function fail(message) {
  setOutput("status", "error");
  setOutput("message", message);
  console.error("ERROR:", message);
  process.exit(0);
}

function buildActionButton(kind, value) {
  if (!value) return "";
  if (kind === "phone") {
    const tel = value.replace(/[^\d+]/g, "");
    return `<a href="tel:${esc(tel)}">&#128222; Call</a>`;
  }
  const digits = value.replace(/[^\d]/g, "");
  return `<a class="wa" href="https://wa.me/${esc(digits)}" target="_blank" rel="noopener">&#128172; WhatsApp</a>`;
}

function buildInfoRow(label, value) {
  if (!value) return "";
  return `<dt>${esc(label)}</dt><dd>${esc(value)}</dd>`;
}

function buildGallery(imageUrlsRaw) {
  const urls = (imageUrlsRaw || "")
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);
  if (urls.length === 0) return "";
  const imgs = urls
    .map((u) => `<img src="${esc(u)}" alt="" loading="lazy">`)
    .join("\n      ");
  return `<div class="gallery">\n      ${imgs}\n    </div>`;
}

function main() {
  const body = process.env.ISSUE_BODY || "";
  const issueNumber = process.env.ISSUE_NUMBER || "";
  const issueAuthor = process.env.ISSUE_AUTHOR || "";
  const pagesBaseUrl = (process.env.PAGES_BASE_URL || "").replace(/\/+$/, "");

  const fields = parseIssueBody(body);

  const accessCode = (fields["Access code"] || "").trim().toLowerCase();
  if (accessCode !== ACCESS_CODE) {
    fail("Invalid access code. Please check the code and edit this issue to try again.");
    return;
  }

  const slug = (fields["Page URL (slug)"] || "").trim().toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    fail(
      "Invalid page URL. Use lowercase letters, numbers and hyphens only (e.g. `fresh-grocer`), then edit this issue to try again."
    );
    return;
  }

  const businessName = (fields["Business name"] || "").trim();
  if (!businessName) {
    fail("Business name is required. Please edit this issue to add it.");
    return;
  }

  const themeKey = (fields["Theme"] || "retail").trim().toLowerCase();
  const theme = THEMES[themeKey];
  if (!theme) {
    fail(`Invalid theme "${themeKey}". Choose one of: ${Object.keys(THEMES).join(", ")}.`);
    return;
  }

  const description = (fields["Description"] || "").trim();
  const phone = (fields["Phone number"] || "").trim();
  const whatsapp = (fields["WhatsApp number"] || "").trim();
  const email = (fields["Email"] || "").trim();
  const address = (fields["Address"] || "").trim();
  const imageUrls = (fields["Photo URLs (optional)"] || "").trim();

  const pageDir = path.join(REPO_ROOT, "p", slug);
  const metaPath = path.join(pageDir, "meta.json");

  if (fs.existsSync(metaPath)) {
    const existingMeta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    if (existingMeta.owner && existingMeta.owner !== issueAuthor) {
      fail(
        `The page URL "${slug}" is already taken by another user. Please choose a different slug and edit this issue.`
      );
      return;
    }
  }

  const template = fs.readFileSync(
    path.join(REPO_ROOT, "templates", "page-template.html"),
    "utf8"
  );

  const html = template
    .replaceAll("{{BUSINESS_NAME}}", esc(businessName))
    .replaceAll("{{DESCRIPTION}}", esc(description))
    .replaceAll("{{THEME_LABEL}}", esc(theme.label))
    .replaceAll("{{THEME_COLOR}}", theme.color)
    .replaceAll("{{THEME_COLOR_DARK}}", theme.dark)
    .replaceAll("{{THEME_COLOR_LIGHT}}", theme.light)
    .replaceAll("{{PHONE_ACTION}}", buildActionButton("phone", phone))
    .replaceAll("{{WHATSAPP_ACTION}}", buildActionButton("whatsapp", whatsapp))
    .replaceAll("{{GALLERY_BLOCK}}", buildGallery(imageUrls))
    .replaceAll("{{PHONE_ROW}}", buildInfoRow("Phone", phone))
    .replaceAll("{{WHATSAPP_ROW}}", buildInfoRow("WhatsApp", whatsapp))
    .replaceAll("{{EMAIL_ROW}}", buildInfoRow("Email", email))
    .replaceAll("{{ADDRESS_ROW}}", buildInfoRow("Address", address));

  fs.mkdirSync(pageDir, { recursive: true });
  fs.writeFileSync(path.join(pageDir, "index.html"), html);
  fs.writeFileSync(
    metaPath,
    JSON.stringify(
      {
        owner: issueAuthor,
        issue: issueNumber,
        updated_at: new Date().toISOString(),
      },
      null,
      2
    )
  );

  const url = pagesBaseUrl ? `${pagesBaseUrl}/p/${slug}/` : `p/${slug}/`;
  setOutput("status", "ok");
  setOutput("slug", slug);
  setOutput("url", url);
  setOutput(
    "message",
    `Your page is live: ${url}\n\nEdit this issue any time with the same access code to update it.`
  );
}

main();
