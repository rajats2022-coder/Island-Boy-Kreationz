import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { del } from "@vercel/blob";
import {
  EVENT_ID,
  blobExists,
  campaignMailMarkerPath,
  createStaffSession,
  redeemTicket,
  redemptionPath,
  ticketPath,
  verifyStaffSession,
  writeJson
} from "../api/_lib/event-tickets.js";
import {
  extractSubmission,
  localEventClock,
  reminderEmailHtml,
  reminderEmailText,
  ticketEmailHtml,
  ticketEmailText,
  ticketForSubmission,
  ticketMimeMessage
} from "../scripts/july-26-ticketing.mjs";

function encoded(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

test("Formspree notifications preserve event fields and party size", () => {
  const message = {
    id: "test-message",
    internalDate: String(Date.parse("2026-07-25T18:30:00Z")),
    payload: {
      headers: [{ name: "Subject", value: "July 26 free event sign-up - Island Boy Kreationz" }],
      mimeType: "text/plain",
      body: {
        data: encoded(`Full name
Jordan Guest
Email
jordan@example.com
Phone number
(704) 555-0123
Guests you are bringing
4`)
      }
    }
  };
  const submission = extractSubmission(message);
  assert.equal(submission.name, "Jordan Guest");
  assert.equal(submission.email, "jordan@example.com");
  assert.equal(submission.phone, "7045550123");
  assert.equal(submission.guestsBringing, 4);
  assert.equal(submission.partySize, 5);
  assert.equal(submission.excluded, false);
});

test("ticket generation is stable and email contains the one-party rule", () => {
  const submission = {
    messageId: "message-1",
    registeredAt: "2026-07-25T18:30:00.000Z",
    name: "Jordan Guest",
    email: "jordan@example.com",
    phone: "7045550123",
    guestsBringing: 4,
    partySize: 5
  };
  const first = ticketForSubmission(submission);
  const second = ticketForSubmission(submission);
  assert.equal(first.token, second.token);
  assert.equal(first.partySize, 5);
  assert.equal(first.phoneLast4, "0123");
  assert.match(first.backupCode, /^[A-F0-9]{8}$/);

  const passUrl = `https://islandboykreationz.com/event-ticket?t=${first.token}`;
  assert.match(ticketEmailText(first, passUrl), /One QR pass covers your entire registered party/i);
  assert.match(ticketEmailHtml(first, passUrl), /One pass covers the whole party/i);

  const mime = ticketMimeMessage({
    to: "jordan@example.com",
    subject: "Ticket test",
    text: ticketEmailText(first, passUrl),
    html: ticketEmailHtml(first, passUrl),
    qrPng: Buffer.from("fake-png")
  });
  assert.match(mime, /multipart\/related/);
  assert.match(mime, /Content-ID: <island-boy-event-qr>/);
  assert.match(mime, /Content-Type: image\/png/);
});

test("event-day reminder has the verified links, schedule, QR, and exact party limit", () => {
  const ticket = ticketForSubmission({
    messageId: "message-reminder",
    registeredAt: "2026-07-25T18:30:00.000Z",
    name: "Jordan Guest",
    email: "jordan@example.com",
    phone: "7045550123",
    guestsBringing: 4,
    partySize: 5
  });
  const passUrl = `https://islandboykreationz.com/event-ticket?t=${ticket.token}`;
  const text = reminderEmailText(ticket, passUrl);
  const html = reminderEmailHtml(ticket, passUrl);

  for (const body of [text, html]) {
    assert.match(body, /1:00 PM[–-]7:00 PM/);
    assert.match(body, /exactly (?:<strong>)?5 total people/i);
    assert.match(body, /reserved RSVP line/i);
    assert.match(body, /redeem(?:ed|s)?(?: the QR| it)? (?:only )?once/i);
    assert.match(body, /instagram\.com\/islandboy_kreationz\//);
    assert.match(body, /search\.google\.com\/local\/writereview\?placeid=ChIJfzWYLwcfVIgRJqnv34H5mi8/);
    assert.match(body, /Reviews are optional/i);
  }
  assert.match(html, /cid:island-boy-event-qr/);
  assert.equal(localEventClock(new Date("2026-07-26T15:00:00.000Z")).date, "2026-07-26");
  assert.equal(localEventClock(new Date("2026-07-26T15:00:00.000Z")).hour, 11);
  assert.match(campaignMailMarkerPath("event-day-11am", ticket.token), /mail\/event-day-11am\//);
});

test("staff sessions expire and reject tampering", () => {
  const now = Date.now();
  const session = createStaffSession(now);
  assert.equal(verifyStaffSession(session, now + 1000), true);
  assert.equal(verifyStaffSession(`${session}x`, now + 1000), false);
  assert.equal(verifyStaffSession(session, now + 13 * 60 * 60 * 1000), false);
});

test("missing durable markers are treated as absent", async () => {
  const missing = `events/${EVENT_ID}/tests/missing-${randomBytes(16).toString("hex")}.json`;
  assert.equal(await blobExists(missing), false);
});

test("redemption is create-once under the live private store", async () => {
  const token = randomBytes(32).toString("base64url");
  const ticket = {
    version: 1,
    eventId: EVENT_ID,
    name: "Atomic Redemption Test",
    partySize: 2,
    backupCode: "TEST0001",
    emailMasked: "te****@example.com",
    phoneLast4: "0001",
    registeredAt: new Date().toISOString()
  };

  try {
    await writeJson(ticketPath(token), ticket);
    const [first, second] = await Promise.all([
      redeemTicket(token, { staff: "test-a" }),
      redeemTicket(token, { staff: "test-b" })
    ]);
    const outcomes = [first, second];
    assert.equal(outcomes.filter((item) => item.ok).length, 1);
    assert.equal(outcomes.filter((item) => item.reason === "already_redeemed").length, 1);
  } finally {
    await del([ticketPath(token), redemptionPath(token)]).catch(() => {});
  }
});
