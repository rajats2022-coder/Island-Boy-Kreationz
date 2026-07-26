import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { get, head, put } from "@vercel/blob";

export const EVENT_ID = "island-boy-7-year-2026-07-26";
export const EVENT_DATE = "2026-07-26";
export const STAFF_COOKIE = "ibx_event_staff";

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function tokenDigest(token) {
  return createHash("sha256").update(String(token || "")).digest("hex");
}

export function cleanToken(value) {
  const token = String(value || "").trim();
  return /^[A-Za-z0-9_-]{32,96}$/.test(token) ? token : "";
}

export function ticketPath(token) {
  return `events/${EVENT_ID}/tickets/${tokenDigest(token)}.json`;
}

export function redemptionPath(token) {
  return `events/${EVENT_ID}/redemptions/${tokenDigest(token)}.json`;
}

export function mailMarkerPath(token) {
  return `events/${EVENT_ID}/mail/${tokenDigest(token)}.json`;
}

export function manifestPath() {
  return `events/${EVENT_ID}/manifest.json`;
}

function notFound(error) {
  return error?.name === "BlobNotFoundError"
    || error?.status === 404
    || error?.statusCode === 404
    || /\b404\b|not found|does not exist/i.test(String(error?.message || ""));
}

export function isBlobConflict(error) {
  return error?.name === "BlobOverwriteError"
    || error?.name === "BlobAlreadyExistsError"
    || error?.status === 409
    || error?.statusCode === 409
    || /already exists|overwrite|conflict/i.test(String(error?.message || ""));
}

export async function readJson(pathname) {
  try {
    const result = await get(pathname, { access: "private", useCache: false });
    if (!result || result.statusCode === 404 || !result.stream) return null;
    return new Response(result.stream).json();
  } catch (error) {
    if (notFound(error)) return null;
    throw error;
  }
}

export async function blobExists(pathname) {
  try {
    await head(pathname, { access: "private" });
    return true;
  } catch (error) {
    if (notFound(error)) return false;
    throw error;
  }
}

export async function writeJson(pathname, value, { allowOverwrite = false } = {}) {
  return put(pathname, JSON.stringify(value), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite,
    cacheControlMaxAge: 60,
    contentType: "application/json"
  });
}

export async function getTicket(token) {
  const normalized = cleanToken(token);
  if (!normalized) return null;
  return readJson(ticketPath(normalized));
}

export async function getRedemption(token) {
  const normalized = cleanToken(token);
  if (!normalized) return null;
  return readJson(redemptionPath(normalized));
}

export async function redeemTicket(token, metadata = {}) {
  const normalized = cleanToken(token);
  if (!normalized) return { ok: false, reason: "invalid" };
  const ticket = await getTicket(normalized);
  if (!ticket || ticket.eventId !== EVENT_ID) return { ok: false, reason: "invalid" };

  const redemption = {
    version: 1,
    eventId: EVENT_ID,
    ticketHash: tokenDigest(normalized),
    redemptionId: randomUUID(),
    redeemedAt: new Date().toISOString(),
    staff: String(metadata.staff || "event-staff").slice(0, 80),
    userAgent: String(metadata.userAgent || "").slice(0, 240)
  };

  try {
    await writeJson(redemptionPath(normalized), redemption);
    return { ok: true, ticket, redemption };
  } catch (error) {
    if (!isBlobConflict(error)) throw error;
    return {
      ok: false,
      reason: "already_redeemed",
      ticket,
      redemption: await getRedemption(normalized)
    };
  }
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

export function createStaffSession(now = Date.now()) {
  const payload = {
    version: 1,
    exp: now + 12 * 60 * 60 * 1000,
    nonce: randomUUID()
  };
  const encoded = base64url(JSON.stringify(payload));
  const signature = createHmac("sha256", required("EVENT_SESSION_SECRET"))
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyStaffSession(value, now = Date.now()) {
  try {
    const [encoded, signature] = String(value || "").split(".");
    if (!encoded || !signature) return false;
    const expected = createHmac("sha256", required("EVENT_SESSION_SECRET"))
      .update(encoded)
      .digest("base64url");
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return false;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    return payload?.version === 1 && Number(payload.exp) > now;
  } catch {
    return false;
  }
}

export function verifyStaffPin(value) {
  const actual = Buffer.from(String(value || ""));
  const expected = Buffer.from(required("EVENT_STAFF_PIN"));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function parseCookies(header = "") {
  return Object.fromEntries(
    String(header)
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return index === -1
          ? [decodeURIComponent(part), ""]
          : [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

export function isStaffRequest(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  return verifyStaffSession(cookies[STAFF_COOKIE]);
}

export function publicTicket(ticket, redemption = null) {
  return {
    eventId: EVENT_ID,
    eventDate: EVENT_DATE,
    name: ticket.name,
    partySize: ticket.partySize,
    backupCode: ticket.backupCode,
    status: redemption ? "redeemed" : "valid",
    redeemedAt: redemption?.redeemedAt || null
  };
}

export function staffTicket(ticket, redemption = null) {
  return {
    ...publicTicket(ticket, redemption),
    emailMasked: ticket.emailMasked || "",
    phoneLast4: ticket.phoneLast4 || "",
    registeredAt: ticket.registeredAt || null
  };
}

export function noStore(res, status = 200) {
  res.statusCode = status;
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.setHeader("X-Content-Type-Options", "nosniff");
}

export async function jsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}
