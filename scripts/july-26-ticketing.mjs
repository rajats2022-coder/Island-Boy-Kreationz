#!/usr/bin/env node

import { createHmac } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import {
  EVENT_DATE,
  EVENT_ID,
  blobExists,
  mailMarkerPath,
  manifestPath,
  ticketPath,
  tokenDigest,
  writeJson
} from "../api/_lib/event-tickets.js";

const root = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "");
const envPath = join(root, ".env.local");
const vercelEnvPath = join(root, ".env.vercel.local");
const statePath = join(root, "data", "july-26-ticket-state.json");
const gmailClientFilePath = process.env.ISLAND_BOY_GMAIL_OAUTH_CLIENT_FILE
  || join(root, ".secrets", "island-boy-gmail-oauth-client.json");
const hermesEnvPath = process.env.HOME ? join(process.env.HOME, ".hermes", ".env") : "";
const args = new Set(process.argv.slice(2));
const EVENT_NAME = "Island Boy Kreationz 7-Year Anniversary";

loadDotEnv(envPath);
loadDotEnv(vercelEnvPath);
loadDotEnv(process.env.ISLAND_BOY_SHARED_GOOGLE_ENV_PATH || "");
loadDotEnv(hermesEnvPath);

function argumentValue(name) {
  const prefix = `${name}=`;
  const item = [...args].find((arg) => arg.startsWith(prefix));
  return item ? item.slice(prefix.length) : "";
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function loadDotEnv(path) {
  if (!path || !existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

function readState() {
  if (!existsSync(statePath)) return { runs: [], emailedTicketHashes: [] };
  return JSON.parse(readFileSync(statePath, "utf8"));
}

function writeState(state) {
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

async function fetchJson(url, options = {}) {
  const { label = "Request", ...fetchOptions } = options;
  const response = await fetch(url, fetchOptions);
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) throw new Error(`${label} failed: ${response.status}`);
  return payload;
}

function gmailClientCredentials() {
  if (existsSync(gmailClientFilePath)) {
    const payload = JSON.parse(readFileSync(gmailClientFilePath, "utf8"));
    const client = payload.web || payload.installed || {};
    if (!client.client_id || !client.client_secret) throw new Error("Gmail OAuth client file is incomplete.");
    return { clientId: client.client_id, clientSecret: client.client_secret };
  }
  return {
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || ""
  };
}

async function gmailAccessToken() {
  const { clientId, clientSecret } = gmailClientCredentials();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: required("ISLAND_BOY_GMAIL_REFRESH_TOKEN"),
    grant_type: "refresh_token"
  });
  const payload = await fetchJson("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    label: "Gmail OAuth refresh"
  });
  return payload.access_token;
}

async function gmailApi(path, token, options = {}) {
  return fetchJson(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    label: options.label || `Gmail ${path}`
  });
}

function decodeBase64Url(value = "") {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function encodeBase64Url(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function header(message, name) {
  return (message.payload?.headers || [])
    .find((item) => item.name.toLowerCase() === name.toLowerCase())?.value || "";
}

function collectBodies(part, out = []) {
  if (part?.body?.data) out.push({ mimeType: part.mimeType || "text/plain", text: decodeBase64Url(part.body.data) });
  for (const child of part?.parts || []) collectBodies(child, out);
  return out;
}

function htmlToText(html) {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>|<\/div>|<\/tr>|<\/li>|<\/td>|<\/th>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .trim();
}

function normalizedPhone(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function cleanName(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 100);
}

function firstField(text, labels, valuePattern = "[^\\n|]{1,160}") {
  const labelPattern = labels
    .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "[ _-]+"))
    .join("|");
  return text.match(new RegExp(`(?:^|\\n)\\s*(?:${labelPattern})\\s*[:\\-]?\\s*(?:\\n\\s*)?(${valuePattern})`, "im"))?.[1]?.trim() || "";
}

export function extractSubmission(message) {
  const bodies = collectBodies(message.payload);
  const plain = bodies.find((part) => part.mimeType === "text/plain")?.text || "";
  const html = bodies.find((part) => part.mimeType === "text/html")?.text || "";
  const text = `${plain}\n${htmlToText(html)}\n${message.snippet || ""}`;
  const emailMatch = text.match(/(?:^|\n)\s*(?:email|email address)\s*[:\-]?\s*(?:\n\s*)?([^\s<>]+@[^\s<>]+\.[^\s<>]+)/im)
    || text.match(/mailto:([^"'<>\s]+@[^"'<>\s]+)/i)
    || text.match(/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i);
  const email = (emailMatch?.[1] || "").trim().toLowerCase().replace(/[),.;]+$/, "");
  const name = cleanName(firstField(text, ["name", "full name"]));
  const phoneRaw = firstField(text, ["phone", "phone number", "telephone"], "[+()0-9. -]{7,30}");
  const guestsRaw = firstField(
    text,
    ["guests_bringing", "guests bringing", "guests you are bringing", "guest count", "guests"],
    "\\d{1,2}"
  );
  const guestsBringing = Math.max(0, Math.min(12, Number.parseInt(guestsRaw || "0", 10) || 0));
  const subject = header(message, "Subject");
  const excluded = !email
    || email === "codex-test@example.com"
    || email === "rajats2022@gmail.com"
    || /connection test/i.test(subject);
  return {
    messageId: message.id,
    registeredAt: new Date(Number(message.internalDate || Date.now())).toISOString(),
    name,
    email,
    phone: normalizedPhone(phoneRaw),
    guestsBringing,
    partySize: guestsBringing + 1,
    excluded,
    hasPhone: Boolean(normalizedPhone(phoneRaw)),
    hasGuestField: Boolean(guestsRaw)
  };
}

function ticketToken(email) {
  return createHmac("sha256", required("EVENT_TICKET_SECRET"))
    .update(`${EVENT_ID}\0${email}`)
    .digest("base64url");
}

function backupCode(token) {
  return createHmac("sha256", required("EVENT_TICKET_SECRET"))
    .update(`backup\0${token}`)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();
}

function maskEmail(email) {
  const [local, domain] = String(email || "").split("@");
  if (!local || !domain) return "";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(2, Math.min(6, local.length - visible.length)))}@${domain}`;
}

function normalizedSearch(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9@.+_-]/g, "");
}

export function ticketForSubmission(submission) {
  const token = ticketToken(submission.email);
  return {
    version: 1,
    eventId: EVENT_ID,
    eventDate: EVENT_DATE,
    token,
    tokenHash: tokenDigest(token),
    backupCode: backupCode(token),
    name: submission.name || "Island Boy Guest",
    email: submission.email,
    emailMasked: maskEmail(submission.email),
    phone: submission.phone,
    phoneLast4: submission.phone.slice(-4),
    guestsBringing: submission.guestsBringing,
    partySize: submission.partySize,
    sourceMessageId: submission.messageId,
    registeredAt: submission.registeredAt,
    issuedAt: new Date().toISOString()
  };
}

async function listSubmissionMessages(token) {
  const query = process.env.ISLAND_BOY_GMAIL_QUERY
    || 'subject:"July 26 free event sign-up - Island Boy Kreationz" after:2026/07/09';
  const refs = [];
  let pageToken = "";
  do {
    const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    url.searchParams.set("q", query);
    url.searchParams.set("maxResults", "100");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const page = await fetchJson(url, {
      headers: { Authorization: `Bearer ${token}` },
      label: "Gmail messages.list"
    });
    refs.push(...(page.messages || []));
    pageToken = page.nextPageToken || "";
  } while (pageToken && refs.length < 500);

  const messages = [];
  for (const ref of refs) {
    messages.push(await gmailApi(`messages/${ref.id}?format=full`, token, { label: "Gmail messages.get" }));
  }
  return messages;
}

function deduplicateSubmissions(messages) {
  const parsed = messages.map(extractSubmission);
  const usable = parsed.filter((item) => !item.excluded);
  const latestByEmail = new Map();
  for (const item of usable.sort((a, b) => a.registeredAt.localeCompare(b.registeredAt))) {
    latestByEmail.set(item.email, item);
  }
  return {
    parsed,
    submissions: [...latestByEmail.values()],
    excluded: parsed.filter((item) => item.excluded).length,
    duplicates: usable.length - latestByEmail.size,
    missingName: [...latestByEmail.values()].filter((item) => !item.name).length,
    missingPhone: [...latestByEmail.values()].filter((item) => !item.hasPhone).length,
    missingGuestField: [...latestByEmail.values()].filter((item) => !item.hasGuestField).length
  };
}

function printAudit(audit) {
  const people = audit.submissions.reduce((sum, item) => sum + item.partySize, 0);
  console.log([
    "Island Boy July 26 ticket audit",
    `Gmail notification messages: ${audit.parsed.length}`,
    `Unique event registrants: ${audit.submissions.length}`,
    `People represented by RSVPs: ${people}`,
    `Duplicate registrations collapsed: ${audit.duplicates}`,
    `Test/invalid notifications excluded: ${audit.excluded}`,
    `Missing names: ${audit.missingName}`,
    `Missing phone fields: ${audit.missingPhone}`,
    `Missing guest-count fields: ${audit.missingGuestField}`
  ].join("\n"));
}

async function syncTickets(tickets) {
  for (const ticket of tickets) {
    await writeJson(ticketPath(ticket.token), ticket, { allowOverwrite: true });
  }
  const manifest = {
    version: 1,
    eventId: EVENT_ID,
    generatedAt: new Date().toISOString(),
    count: tickets.length,
    people: tickets.reduce((sum, ticket) => sum + ticket.partySize, 0),
    tickets: tickets.map((ticket) => ({
      token: ticket.token,
      name: ticket.name,
      partySize: ticket.partySize,
      backupCode: ticket.backupCode,
      emailMasked: ticket.emailMasked,
      phoneLast4: ticket.phoneLast4,
      search: normalizedSearch([
        ticket.name,
        ticket.email,
        ticket.phone,
        ticket.phoneLast4,
        ticket.backupCode
      ].join(" "))
    }))
  };
  await writeJson(manifestPath(), manifest, { allowOverwrite: true });
  console.log(`Synced ${tickets.length} private ticket records and the staff lookup manifest.`);
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function firstName(name) {
  return String(name || "").trim().split(/\s+/)[0].replace(/[^\p{L}'-]/gu, "");
}

export function ticketEmailText(ticket, passUrl) {
  const greeting = firstName(ticket.name) ? `Hi ${firstName(ticket.name)},` : "Hi Island Boy family,";
  return `${greeting}

Your personalized QR pass for the Island Boy Kreationz 7-Year Anniversary on Sunday, July 26, 2026 is ready.

REGISTERED PARTY: ${ticket.name}
TOTAL PEOPLE COVERED: ${ticket.partySize}
BACKUP CODE: ${ticket.backupCode}

Open your pass:
${passUrl}

Important event-day rules:
- One QR pass covers your entire registered party.
- Everyone must be present together before the pass is redeemed.
- Staff will redeem it only when food is handed out.
- Once redeemed, it cannot be used again.
- Free food remains available while supplies last.

Before driving, check @islandboy_kreationz on Instagram or text 980-785-8372 for final time, location, weather, or supply updates.

Thank you for celebrating seven years with Island Boy Kreationz!

Deon Henry
Island Boy Kreationz Food Truck & Catering
980-785-8372

Do not want event follow-up emails? Reply "unsubscribe."`;
}

export function ticketEmailHtml(ticket, passUrl) {
  const greeting = firstName(ticket.name) ? `Hi ${escapeHtml(firstName(ticket.name))},` : "Hi Island Boy family,";
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#fff7ed;font-family:Arial,Helvetica,sans-serif;color:#2d1a10;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your one-time July 26 QR pass is ready for your party of ${ticket.partySize}.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff7ed;padding:22px 10px;"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #f0d5bd;border-radius:20px;overflow:hidden;box-shadow:0 8px 24px rgba(72,35,11,.12);">
      <tr><td align="center" style="background:#2b1205;padding:26px 22px;">
        <img src="https://islandboykreationz.com/assets/island-boy-logo.png" width="76" height="76" alt="Island Boy Kreationz" style="display:block;border-radius:50%;margin:0 auto 12px;">
        <div style="font-size:11px;line-height:18px;letter-spacing:2px;text-transform:uppercase;color:#ffd59b;font-weight:bold;">Sunday · July 26, 2026</div>
        <h1 style="margin:7px 0 0;color:#ffffff;font-size:29px;line-height:36px;">Your party QR pass is ready</h1>
      </td></tr>
      <tr><td style="padding:28px 26px 10px;">
        <p style="margin:0 0 16px;font-size:17px;line-height:26px;font-weight:bold;">${greeting}</p>
        <p style="margin:0 0 18px;font-size:16px;line-height:26px;">This is your personalized pass for the <strong>${EVENT_NAME}</strong>.</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;background:#fff3df;border:1px solid #f0c792;border-radius:14px;">
          <tr><td style="padding:16px;">
            <div style="font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:#8a3f0a;font-weight:bold;">Registered guest</div>
            <div style="margin-top:4px;font-size:21px;font-weight:bold;color:#2b1205;">${escapeHtml(ticket.name)}</div>
          </td><td align="center" style="padding:16px;border-left:1px solid #f0c792;">
            <div style="font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#8a3f0a;font-weight:bold;">Total people</div>
            <div style="margin-top:2px;font-size:34px;font-weight:bold;color:#e76f18;">${ticket.partySize}</div>
          </td></tr>
        </table>
        <p style="margin:0 0 8px;text-align:center;font-size:14px;color:#6e5140;">Show this QR to event staff when your whole party is present.</p>
        <a href="${escapeHtml(passUrl)}" style="display:block;text-align:center;text-decoration:none;">
          <img src="cid:island-boy-event-qr" width="300" height="300" alt="Personalized Island Boy event QR code" style="display:block;width:300px;max-width:100%;height:auto;margin:0 auto;border:10px solid #ffffff;">
        </a>
        <div style="margin:8px 0 20px;text-align:center;">
          <div style="font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#8a6e5c;">Backup code</div>
          <div style="margin-top:4px;font-family:monospace;font-size:24px;font-weight:bold;letter-spacing:3px;color:#2b1205;">${ticket.backupCode}</div>
        </div>
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 22px;"><tr><td bgcolor="#e76f18" style="border-radius:999px;">
          <a href="${escapeHtml(passUrl)}" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">Open My QR Pass</a>
        </td></tr></table>
        <div style="margin:0 0 20px;padding:16px 18px;background:#2b1205;color:#fff7ed;border-radius:12px;font-size:14px;line-height:23px;">
          <strong style="color:#ffd59b;">One pass covers the whole party.</strong><br>
          Everyone must be present together. Staff redeems the pass only when food is handed out. Once redeemed, it cannot be used again.
        </div>
        <p style="margin:0 0 18px;font-size:14px;line-height:23px;color:#6e5140;">Free food remains available while supplies last. Before driving, check <a href="https://www.instagram.com/islandboy_kreationz/" style="color:#b45411;">@islandboy_kreationz</a> or text <a href="tel:+19807858372" style="color:#b45411;">980-785-8372</a> for final time, location, weather, or supply updates.</p>
        <p style="margin:0;font-size:15px;line-height:24px;"><strong>Deon Henry</strong><br>Island Boy Kreationz Food Truck &amp; Catering</p>
      </td></tr>
      <tr><td style="padding:17px 26px 22px;background:#2b1205;color:#d9bfae;text-align:center;font-size:12px;line-height:19px;">
        Do not want event follow-up emails? Reply <strong style="color:#ffffff;">unsubscribe</strong>.
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function wrapBase64(value) {
  const encoded = Buffer.isBuffer(value)
    ? value.toString("base64")
    : Buffer.from(String(value), "utf8").toString("base64");
  return encoded.replace(/.{1,76}/g, "$&\r\n").trim();
}

export function ticketMimeMessage({ to, subject, text, html, qrPng }) {
  const related = `ibx-related-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const alternative = `ibx-alt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
  return [
    `From: Island Boy Kreationz <${process.env.ISLAND_BOY_GMAIL_EMAIL || "deonhenry756@gmail.com"}>`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/related; boundary="${related}"`,
    "",
    `--${related}`,
    `Content-Type: multipart/alternative; boundary="${alternative}"`,
    "",
    `--${alternative}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(text),
    `--${alternative}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(html),
    `--${alternative}--`,
    "",
    `--${related}`,
    'Content-Type: image/png; name="island-boy-july-26-qr.png"',
    "Content-Transfer-Encoding: base64",
    'Content-Disposition: inline; filename="island-boy-july-26-qr.png"',
    "Content-ID: <island-boy-event-qr>",
    "X-Attachment-Id: island-boy-event-qr",
    "",
    wrapBase64(qrPng),
    `--${related}--`,
    ""
  ].join("\r\n");
}

async function sendTicketEmail(gmailToken, ticket, overrideRecipient = "") {
  const baseUrl = process.env.EVENT_BASE_URL || "https://islandboykreationz.com";
  const passUrl = `${baseUrl.replace(/\/$/, "")}/event-ticket?t=${encodeURIComponent(ticket.token)}`;
  const qrPng = await QRCode.toBuffer(passUrl, {
    type: "png",
    width: 420,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#2b1205", light: "#ffffff" }
  });
  const recipient = overrideRecipient || ticket.email;
  const toName = overrideRecipient ? "Ticket Test" : firstName(ticket.name);
  const to = toName ? `${toName} <${recipient}>` : recipient;
  const raw = ticketMimeMessage({
    to,
    subject: `Your Island Boy July 26 QR Pass — Party of ${ticket.partySize}`,
    text: ticketEmailText(ticket, passUrl),
    html: ticketEmailHtml(ticket, passUrl),
    qrPng
  });
  await gmailApi("messages/send", gmailToken, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ raw: encodeBase64Url(raw) }),
    label: "Gmail messages.send"
  });
}

async function sendNewTickets(gmailToken, tickets) {
  const state = readState();
  const locallySent = new Set(state.emailedTicketHashes || []);
  const testTo = argumentValue("--test-to");
  if (testTo) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testTo)) throw new Error("Invalid --test-to email address.");
    const sample = ticketForSubmission({
      messageId: "staff-ticket-test",
      registeredAt: new Date().toISOString(),
      name: "Event Staff Test",
      email: testTo,
      phone: "7045550000",
      guestsBringing: 2,
      partySize: 3
    });
    await writeJson(ticketPath(sample.token), sample, { allowOverwrite: true });
    await sendTicketEmail(gmailToken, sample, testTo);
    console.log("Sent one ticket test email to the requested test recipient.");
    return { candidates: 1, sent: 1, test: true, token: sample.token };
  }

  const unsent = [];
  for (const ticket of tickets) {
    if (locallySent.has(ticket.tokenHash)) continue;
    if (await blobExists(mailMarkerPath(ticket.token))) {
      locallySent.add(ticket.tokenHash);
      continue;
    }
    unsent.push(ticket);
  }

  const configuredLimit = Number(process.env.EVENT_TICKET_SEND_LIMIT || 25);
  const limit = args.has("--send-all") ? unsent.length : Math.max(1, Math.min(100, configuredLimit));
  const selected = unsent.slice(0, limit);
  let sent = 0;
  for (const ticket of selected) {
    await sendTicketEmail(gmailToken, ticket);
    await writeJson(mailMarkerPath(ticket.token), {
      version: 1,
      eventId: EVENT_ID,
      ticketHash: ticket.tokenHash,
      sentAt: new Date().toISOString()
    });
    locallySent.add(ticket.tokenHash);
    sent += 1;
    console.log(`Sent ticket ${sent}/${selected.length}.`);
  }

  state.emailedTicketHashes = [...locallySent].sort();
  state.runs = [{
    at: new Date().toISOString(),
    mode: "ticket-send",
    candidates: unsent.length,
    selected: selected.length,
    sent
  }, ...(state.runs || [])].slice(0, 60);
  writeState(state);
  console.log(`Ticket email run complete: candidates=${unsent.length} sent=${sent} backlog=${Math.max(0, unsent.length - sent)}`);
  return { candidates: unsent.length, sent, backlog: Math.max(0, unsent.length - sent) };
}

function localDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

async function main() {
  required("EVENT_TICKET_SECRET");
  const gmailToken = await gmailAccessToken();
  const messages = await listSubmissionMessages(gmailToken);
  const audit = deduplicateSubmissions(messages);
  printAudit(audit);
  const tickets = audit.submissions.map(ticketForSubmission);

  if (args.has("--sync")) await syncTickets(tickets);
  if (args.has("--send-new") || args.has("--send-all") || argumentValue("--test-to")) {
    if (!args.has("--sync")) throw new Error("Ticket sending requires --sync so every emailed pass is live.");
    if (localDateKey() > EVENT_DATE && !args.has("--force")) {
      throw new Error(`Refusing to send event tickets after ${EVENT_DATE}; use --force only for an approved exception.`);
    }
    await sendNewTickets(gmailToken, tickets);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}
