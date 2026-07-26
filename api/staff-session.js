import { isStaffRequest, noStore } from "./_lib/event-tickets.js";

export default async function handler(req, res) {
  noStore(res);
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  return res.status(200).json({ authenticated: isStaffRequest(req) });
}
