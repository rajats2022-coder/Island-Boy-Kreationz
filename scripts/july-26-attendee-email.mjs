#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "");
const envPath = join(root, ".env.local");
const gmailClientFilePath = process.env.ISLAND_BOY_GMAIL_OAUTH_CLIENT_FILE
  || join(root, ".secrets", "island-boy-gmail-oauth-client.json");
const hermesEnvPath = process.env.HOME ? join(process.env.HOME, ".hermes", ".env") : "";
const statePath = join(root, "data", "july-26-email-state.json");
const args = new Set(process.argv.slice(2));

loadDotEnv(envPath);
loadDotEnv(process.env.ISLAND_BOY_SHARED_GOOGLE_ENV_PATH || "");
loadDotEnv(hermesEnvPath);

const campaignSubject = process.env.ISLAND_BOY_CAMPAIGN_SUBJECT || "Your July 26 RSVP is confirmed — one quick favor";

function loadDotEnv(path) {
  if (!path || !existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

function telegramConfig() {
  const allowed = process.env.TELEGRAM_ALLOWED_USERS || "";
  return {
    enabled: process.env.ISLAND_BOY_TELEGRAM_NOTIFY !== "0" && !args.has("--no-telegram"),
    token: process.env.ISLAND_BOY_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || "",
    chatId: process.env.ISLAND_BOY_TELEGRAM_CHAT_ID || process.env.TELEGRAM_HOME_CHANNEL || allowed.split(",").map((value) => value.trim()).find(Boolean) || "",
    threadId: process.env.ISLAND_BOY_TELEGRAM_THREAD_ID || process.env.TELEGRAM_HOME_CHANNEL_THREAD_ID || ""
  };
}

function localDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function sendTelegram(text) {
  const { enabled, token, chatId, threadId } = telegramConfig();
  if (!enabled || !token || !chatId) return false;
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, ...(threadId ? { message_thread_id: Number(threadId) } : {}), text, disable_web_page_preview: true })
    });
    if (!response.ok) {
      console.warn(`Telegram notification failed non-blockingly: ${response.status}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn(`Telegram notification failed non-blockingly: ${error.message}`);
    return false;
  }
}

function gmailClientCredentials() {
  if (existsSync(gmailClientFilePath)) {
    const payload = JSON.parse(readFileSync(gmailClientFilePath, "utf8"));
    const client = payload.web || payload.installed || {};
    if (!client.client_id || !client.client_secret) {
      throw new Error(`Gmail OAuth client file is missing client_id or client_secret: ${gmailClientFilePath}`);
    }
    return { clientId: client.client_id, clientSecret: client.client_secret };
  }
  return {
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || ""
  };
}

function readState() {
  if (!existsSync(statePath)) return { processedMessageIds: [], sentRecipients: [], runs: [] };
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
  if (!response.ok) throw new Error(`${label} failed: ${response.status} ${JSON.stringify(payload)}`);
  return payload;
}

async function gmailAccessToken() {
  const { clientId, clientSecret } = gmailClientCredentials();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: process.env.ISLAND_BOY_GMAIL_REFRESH_TOKEN || "",
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
  return Buffer.from(value, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function header(message, name) {
  return (message.payload?.headers || []).find((item) => item.name.toLowerCase() === name.toLowerCase())?.value || "";
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
    .replace(/<\/p>|<\/div>|<\/tr>|<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .trim();
}

function extractSubmission(message) {
  const bodies = collectBodies(message.payload);
  const plain = bodies.find((part) => part.mimeType === "text/plain")?.text || "";
  const html = bodies.find((part) => part.mimeType === "text/html")?.text || "";
  const text = `${plain}\n${htmlToText(html)}\n${message.snippet || ""}`;
  const emailMatch = text.match(/(?:^|\n)\s*(?:email|email address)\s*[:\-]?\s*(?:\n\s*)?([^\s<>]+@[^\s<>]+\.[^\s<>]+)/im)
    || text.match(/mailto:([^"'<>\s]+@[^"'<>\s]+)/i)
    || text.match(/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i);
  const nameMatch = text.match(/(?:^|\n)\s*(?:name|full name)\s*[:\-]?\s*(?:\n\s*)?([^\n|]{2,80})/im);
  const email = (emailMatch?.[1] || "").trim().toLowerCase().replace(/[),.;]+$/, "");
  const name = (nameMatch?.[1] || "").trim().replace(/\s+/g, " ");
  return { email, name, text };
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function firstName(name) {
  return String(name || "").trim().split(/\s+/)[0].replace(/[^\p{L}'-]/gu, "");
}

function emailText(name = "") {
  const greeting = firstName(name) ? `Hi ${firstName(name)},` : "Hi Island Boy family,";
  return `${greeting}

Thank you for signing up for the Island Boy Kreationz 7-Year Anniversary Celebration on Sunday, July 26, 2026!

We received your RSVP and look forward to celebrating with you. Free food will be available while supplies last. Before driving, please check Instagram or text us for any final time, location, or supply updates.

If you have enjoyed Island Boy Kreationz before, would you take a minute to share an honest Google review? Your feedback helps more people discover our food and supports our continued growth.

Leave an honest Google review:
https://search.google.com/local/writereview?placeid=ChIJfzWYLwcfVIgRJqnv34H5mi8

Check out our website:
https://islandboykreationz.com

If this will be your first time trying our food, no pressure. We would love to hear what you think after the event.

Thank you for supporting Island Boy Kreationz for seven years!

Deon Henry
Island Boy Kreationz Food Truck & Catering
6100 Hunter Ave, Charlotte, NC 28262
980-785-8372
Instagram: @islandboy_kreationz

Do not want event follow-up emails? Reply "unsubscribe."`;
}

function emailHtml(name = "") {
  const greeting = firstName(name) ? `Hi ${escapeHtml(firstName(name))},` : "Hi Island Boy family,";
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#fff7ed;font-family:Arial,Helvetica,sans-serif;color:#2d1a10;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your July 26 anniversary RSVP is confirmed.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff7ed;padding:24px 12px;"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #f0d5bd;border-radius:18px;overflow:hidden;box-shadow:0 8px 24px rgba(72,35,11,.12);">
      <tr><td align="center" style="background:#2b1205;padding:28px 24px 24px;">
        <img src="https://islandboykreationz.com/assets/island-boy-logo.png" width="82" alt="Island Boy Kreationz" style="display:block;border-radius:50%;margin:0 auto 14px;">
        <div style="font-size:12px;line-height:18px;letter-spacing:2px;text-transform:uppercase;color:#ffd59b;font-weight:bold;">Seven years of island flavor</div>
        <h1 style="margin:8px 0 0;color:#ffffff;font-size:30px;line-height:38px;">Your July 26 RSVP is confirmed</h1>
      </td></tr>
      <tr><td style="padding:30px 30px 12px;">
        <p style="margin:0 0 18px;font-size:17px;line-height:27px;font-weight:bold;">${greeting}</p>
        <p style="margin:0 0 18px;font-size:16px;line-height:26px;">Thank you for signing up for the <strong>Island Boy Kreationz 7-Year Anniversary Celebration</strong> on <strong>Sunday, July 26, 2026</strong>!</p>
        <div style="margin:20px 0;padding:16px 18px;background:#fff3df;border-left:5px solid #ed7d22;border-radius:10px;font-size:15px;line-height:24px;">
          We received your RSVP and look forward to celebrating with you. Free food will be available <strong>while supplies last</strong>. Before driving, check Instagram or text us for final time, location, or supply updates.
        </div>
        <h2 style="margin:26px 0 10px;color:#8a3f0a;font-size:21px;line-height:28px;">Enjoyed Island Boy before?</h2>
        <p style="margin:0 0 18px;font-size:16px;line-height:26px;">Would you take a minute to share an <strong>honest Google review</strong>? Your feedback helps more people discover our food and supports our continued growth.</p>
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 14px;"><tr><td align="center" bgcolor="#e76f18" style="border-radius:999px;box-shadow:0 5px 14px rgba(231,111,24,.25);">
          <a href="https://search.google.com/local/writereview?placeid=ChIJfzWYLwcfVIgRJqnv34H5mi8" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">Leave an Honest Google Review</a>
        </td></tr></table>
        <p style="margin:0 0 22px;text-align:center;color:#785c48;font-size:13px;line-height:20px;">First time trying us? No pressure. We would love your feedback after the event.</p>
        <div style="height:1px;background:#f1ddcd;margin:24px 0;"></div>
        <h2 style="margin:0 0 10px;text-align:center;color:#2b1205;font-size:21px;">See the menu, story, and catering options</h2>
        <p style="margin:0 0 18px;text-align:center;color:#6e5140;font-size:15px;line-height:24px;">Check out the Island Boy Kreationz website before the celebration.</p>
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 26px;"><tr><td align="center" bgcolor="#f6c453" style="border-radius:999px;">
          <a href="https://islandboykreationz.com" style="display:inline-block;padding:13px 24px;color:#2b1205;text-decoration:none;font-size:15px;font-weight:bold;">Visit IslandBoyKreationz.com</a>
        </td></tr></table>
        <p style="margin:0 0 8px;font-size:16px;line-height:25px;">Thank you for supporting Island Boy Kreationz for seven years!</p>
        <p style="margin:0;font-size:15px;line-height:24px;"><strong>Deon Henry</strong><br>Island Boy Kreationz Food Truck &amp; Catering<br>6100 Hunter Ave, Charlotte, NC 28262<br><a href="tel:+19807858372" style="color:#b45411;">980-785-8372</a> &nbsp;|&nbsp; <a href="https://www.instagram.com/islandboy_kreationz/" style="color:#b45411;">@islandboy_kreationz</a></p>
      </td></tr>
      <tr><td style="padding:18px 30px 24px;background:#2b1205;color:#d9bfae;text-align:center;font-size:12px;line-height:19px;">
        Do not want event follow-up emails? Reply <strong style="color:#ffffff;">unsubscribe</strong>.
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function wrapBase64(text) {
  return Buffer.from(text, "utf8").toString("base64").replace(/.{1,76}/g, "$&\r\n").trim();
}

function mimeMessage({ to, bcc = "", subject, text, html }) {
  const boundary = `island-boy-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
  const headers = [
    `From: Island Boy Kreationz <${process.env.ISLAND_BOY_GMAIL_EMAIL || "deonhenry756@gmail.com"}>`,
    `To: ${to}`,
    bcc ? `Bcc: ${bcc}` : "",
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`
  ].filter(Boolean);
  return [
    ...headers,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(text),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(html),
    `--${boundary}--`,
    ""
  ].join("\r\n");
}

async function listSubmissionMessages(token) {
  const query = process.env.ISLAND_BOY_GMAIL_QUERY || 'subject:"July 26 free event sign-up - Island Boy Kreationz" after:2026/07/09';
  const messages = [];
  let pageToken = "";
  do {
    const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    url.searchParams.set("q", query);
    url.searchParams.set("maxResults", "100");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const page = await fetchJson(url, { headers: { Authorization: `Bearer ${token}` }, label: "Gmail messages.list" });
    messages.push(...(page.messages || []));
    pageToken = page.nextPageToken || "";
  } while (pageToken && messages.length < 500);
  return messages;
}

async function campaignSentStatus(token) {
  const today = localDateKey();
  if (today < "2026-07-13" || today > "2026-07-14") return null;
  const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  url.searchParams.set("q", `in:sent subject:"${campaignSubject}" after:2026/07/12`);
  url.searchParams.set("maxResults", "1");
  const payload = await fetchJson(url, {
    headers: { Authorization: `Bearer ${token}` },
    label: "Gmail campaign sent-status check"
  });
  return Boolean(payload.messages?.length);
}

async function sendRegistrationEmail(token, submission) {
  const name = firstName(submission.name);
  const to = name ? `${name} <${submission.email}>` : submission.email;
  const raw = mimeMessage({
    to,
    subject: campaignSubject,
    text: emailText(submission.name),
    html: emailHtml(submission.name)
  });
  return gmailApi("messages/send", token, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ raw: encodeBase64Url(raw) }),
    label: "Gmail messages.send"
  });
}

async function polishExistingDraft(token) {
  const drafts = await gmailApi("drafts?maxResults=100", token, { label: "Gmail drafts.list" });
  let matched = null;
  for (const item of drafts.drafts || []) {
    const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/drafts/${item.id}`);
    url.searchParams.set("format", "metadata");
    url.searchParams.append("metadataHeaders", "Subject");
    url.searchParams.append("metadataHeaders", "To");
    url.searchParams.append("metadataHeaders", "Bcc");
    const draft = await fetchJson(url, { headers: { Authorization: `Bearer ${token}` }, label: "Gmail drafts.get" });
    if (header(draft.message, "Subject") === campaignSubject) {
      matched = draft;
      break;
    }
  }
  if (!matched) throw new Error(`No Gmail draft found with subject: ${campaignSubject}`);
  const to = header(matched.message, "To") || (process.env.ISLAND_BOY_GMAIL_EMAIL || "deonhenry756@gmail.com");
  const bcc = header(matched.message, "Bcc");
  if (!bcc) throw new Error("The matching campaign draft has no Bcc recipients; refusing to replace it.");
  const raw = mimeMessage({ to, bcc, subject: campaignSubject, text: emailText(), html: emailHtml() });
  await gmailApi(`drafts/${matched.id}`, token, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: matched.id, message: { raw: encodeBase64Url(raw) } }),
    label: "Gmail drafts.update"
  });
  console.log(`Polished Gmail draft ${matched.id}; Bcc recipients preserved.`);
}

async function runDaily(token) {
  const state = readState();
  const processed = new Set(state.processedMessageIds || []);
  const sent = new Set((state.sentRecipients || []).map((email) => email.toLowerCase()));
  const messageRefs = await listSubmissionMessages(token);
  const messages = [];
  for (const ref of messageRefs) {
    const message = await gmailApi(`messages/${ref.id}?format=full`, token, { label: "Gmail messages.get" });
    messages.push(message);
  }

  if (args.has("--bootstrap")) {
    for (const message of messages) {
      processed.add(message.id);
      const submission = extractSubmission(message);
      if (submission.email) sent.add(submission.email);
    }
    state.processedMessageIds = [...processed];
    state.sentRecipients = [...sent].sort();
    state.bootstrappedAt = new Date().toISOString();
    state.runs = [{ at: new Date().toISOString(), mode: "bootstrap", messages: messages.length }, ...(state.runs || [])].slice(0, 60);
    writeState(state);
    console.log(`Bootstrapped ${messages.length} existing Formspree notification messages; no email sent.`);
    return { mode: "bootstrap", messages: messages.length, candidates: 0, sent: 0 };
  }

  const candidates = [];
  for (const message of messages) {
    if (processed.has(message.id)) continue;
    const subject = header(message, "Subject");
    const submission = extractSubmission(message);
    const excluded = !submission.email
      || submission.email === "codex-test@example.com"
      || submission.email === "rajats2022@gmail.com"
      || /connection test/i.test(subject);
    if (excluded || sent.has(submission.email)) {
      processed.add(message.id);
      continue;
    }
    candidates.push({ message, submission });
  }

  const limit = Number(process.env.ISLAND_BOY_REGISTRATION_SEND_LIMIT || 25);
  const selected = candidates.slice(0, limit);
  if (args.has("--dry-run")) {
    console.log(`[dry-run] Would send ${selected.length} registration emails; ${candidates.length} new unique candidates found.`);
    for (const item of selected) console.log(`- ${item.submission.email} ${item.submission.name || ""}`.trim());
    return { mode: "dry-run", messages: messages.length, candidates: candidates.length, sent: 0 };
  }

  let sentCount = 0;
  for (const item of selected) {
    await sendRegistrationEmail(token, item.submission);
    processed.add(item.message.id);
    sent.add(item.submission.email);
    sentCount += 1;
    console.log(`Sent registration email to ${item.submission.email}`);
  }
  state.processedMessageIds = [...processed];
  state.sentRecipients = [...sent].sort();
  state.runs = [{ at: new Date().toISOString(), mode: "daily", candidates: candidates.length, sent: sentCount }, ...(state.runs || [])].slice(0, 60);
  writeState(state);
  console.log(`Registration runner complete: candidates=${candidates.length} sent=${sentCount}`);
  return { mode: "daily", messages: messages.length, candidates: candidates.length, sent: sentCount };
}

async function main() {
  if (!process.env.ISLAND_BOY_GMAIL_REFRESH_TOKEN) throw new Error("Run scripts/setup-island-boy-gmail-oauth.mjs first.");
  const token = await gmailAccessToken();
  if (args.has("--polish-existing-draft")) {
    await polishExistingDraft(token);
    return;
  }
  const mainCampaignSent = args.has("--dry-run") || args.has("--bootstrap")
    ? null
    : await campaignSentStatus(token);
  const result = await runDaily(token);
  if (result.mode === "daily") {
    await sendTelegram([
      "✅ Island Boy registration-email job complete",
      ...(mainCampaignSent === null ? [] : [`103-person campaign: ${mainCampaignSent ? "confirmed in Sent" : "not found in Sent — check Gmail"}`]),
      `New signups found: ${result.candidates}`,
      `Confirmation emails sent: ${result.sent}`,
      result.candidates > result.sent ? `Queued for next run: ${result.candidates - result.sent}` : "No backlog"
    ].join("\n"));
  }
}

export { emailHtml, emailText };

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(async (error) => {
    console.error(error.stack || error.message);
    try {
      await sendTelegram(`❌ Island Boy registration-email job failed\n${String(error.message || error).slice(0, 500)}`);
    } catch {}
    process.exit(1);
  });
}
