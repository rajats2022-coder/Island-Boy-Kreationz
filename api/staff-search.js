import {
  isStaffRequest,
  manifestPath,
  noStore,
  readJson
} from "./_lib/event-tickets.js";

function normalized(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9@.+_-]/g, "");
}

export default async function handler(req, res) {
  noStore(res);
  if (!isStaffRequest(req)) return res.status(401).json({ error: "Staff login required" });
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const query = normalized(Array.isArray(req.query?.q) ? req.query.q[0] : req.query?.q);
  if (query.length < 3) return res.status(400).json({ error: "Enter at least 3 characters" });

  const manifest = await readJson(manifestPath());
  if (!manifest?.tickets) return res.status(503).json({ error: "Ticket list is not ready" });
  const matches = manifest.tickets
    .filter((ticket) => ticket.search.includes(query))
    .slice(0, 12)
    .map(({ search, ...ticket }) => ticket);
  return res.status(200).json({ matches });
}
