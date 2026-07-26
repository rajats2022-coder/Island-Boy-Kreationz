(() => {
  const content = document.querySelector("#ticket-content");
  const token = new URLSearchParams(location.search).get("t") || "";

  function escaped(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function formattedTime(value) {
    if (!value) return "";
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date(value));
  }

  function renderError(message) {
    content.innerHTML = `
      <div class="ticket-status error">
        <span class="dot" aria-hidden="true"></span>
        <div><strong>Pass not available</strong><span>${escaped(message)}</span></div>
      </div>
      <p class="ticket-rule">Use the personalized link from your Island Boy email, or ask staff to look up your RSVP by name and phone number.</p>
      <div class="ticket-actions">
        <a class="ticket-button secondary" href="tel:+19807858372">Call or text 980-785-8372</a>
      </div>`;
  }

  function render(ticket) {
    const redeemed = ticket.status === "redeemed";
    content.innerHTML = `
      <div class="ticket-status ${redeemed ? "redeemed" : "valid"}">
        <span class="dot" aria-hidden="true"></span>
        <div>
          <strong>${redeemed ? "This party has already been served" : "Valid — ready for event staff"}</strong>
          <span>${redeemed ? `Redeemed ${escaped(formattedTime(ticket.redeemedAt))}` : "Do not scan this pass until your full party is present."}</span>
        </div>
      </div>
      <div class="ticket-details">
        <div class="ticket-detail wide"><small>Registered guest</small><strong>${escaped(ticket.name)}</strong></div>
        <div class="ticket-detail party"><small>Total people covered</small><strong>${escaped(ticket.partySize)}</strong></div>
        <div class="ticket-detail"><small>Backup code</small><strong>${escaped(ticket.backupCode)}</strong></div>
        <div class="ticket-detail wide"><small>Event</small><strong>Island Boy Kreationz 7-Year Anniversary · July 26</strong></div>
      </div>
      <p class="ticket-rule"><strong>One pass covers the whole party.</strong> Everyone must be present together. Once staff hands out the food and redeems this pass, it cannot be used again.</p>
      <div class="ticket-actions">
        <a class="ticket-button" href="https://www.instagram.com/islandboy_kreationz/" target="_blank" rel="noopener">Check final event updates</a>
        <a class="ticket-button secondary" href="tel:+19807858372">Call or text the team</a>
      </div>`;
  }

  if (!token) {
    renderError("The secure ticket token is missing.");
    return;
  }

  fetch(`/api/ticket?token=${encodeURIComponent(token)}`, {
    credentials: "same-origin",
    cache: "no-store"
  })
    .then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "We could not load this pass.");
      return payload.ticket;
    })
    .then(render)
    .catch((error) => renderError(error.message));
})();
