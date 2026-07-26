import {
  getRedemption,
  getTicket,
  isStaffRequest,
  noStore,
  staffTicket
} from "./_lib/event-tickets.js";

export default async function handler(req, res) {
  noStore(res);
  if (!isStaffRequest(req)) return res.status(401).json({ error: "Staff login required" });
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = Array.isArray(req.query?.token) ? req.query.token[0] : req.query?.token;
  const ticket = await getTicket(token);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });
  const redemption = await getRedemption(token);
  return res.status(200).json({ ticket: staffTicket(ticket, redemption) });
}
