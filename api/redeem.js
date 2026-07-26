import {
  isStaffRequest,
  jsonBody,
  noStore,
  redeemTicket,
  staffTicket
} from "./_lib/event-tickets.js";

export default async function handler(req, res) {
  noStore(res);
  if (!isStaffRequest(req)) return res.status(401).json({ error: "Staff login required" });
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body = {};
  try {
    body = await jsonBody(req);
  } catch {
    return res.status(400).json({ error: "Invalid request" });
  }

  const result = await redeemTicket(body.token, {
    staff: "staff-scanner",
    userAgent: req.headers["user-agent"] || ""
  });
  if (result.reason === "invalid") return res.status(404).json({ error: "Ticket not found" });
  if (result.reason === "already_redeemed") {
    return res.status(409).json({
      error: "Ticket already redeemed",
      ticket: staffTicket(result.ticket, result.redemption)
    });
  }
  return res.status(200).json({
    ok: true,
    ticket: staffTicket(result.ticket, result.redemption)
  });
}
