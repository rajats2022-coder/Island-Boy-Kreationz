import {
  STAFF_COOKIE,
  createStaffSession,
  jsonBody,
  noStore,
  verifyStaffPin
} from "./_lib/event-tickets.js";

export default async function handler(req, res) {
  noStore(res);
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

  if (!verifyStaffPin(body.pin)) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return res.status(401).json({ error: "Incorrect staff PIN" });
  }

  const secure = process.env.VERCEL || String(req.headers["x-forwarded-proto"] || "").includes("https");
  const session = createStaffSession();
  res.setHeader(
    "Set-Cookie",
    `${STAFF_COOKIE}=${encodeURIComponent(session)}; Max-Age=43200; Path=/; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}`
  );
  return res.status(200).json({ ok: true });
}
