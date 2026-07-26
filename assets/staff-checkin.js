(() => {
  const loginForm = document.querySelector("#staff-login");
  const loginStatus = document.querySelector("#login-status");
  const tools = document.querySelector("#staff-tools");
  const result = document.querySelector("#staff-result");
  const searchForm = document.querySelector("#manual-search");
  const searchResults = document.querySelector("#search-results");
  const connection = document.querySelector("#connection");
  let scanner = null;
  let activeToken = "";
  let handlingScan = false;

  function escaped(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function formattedTime(value) {
    if (!value) return "time unavailable";
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit"
    }).format(new Date(value));
  }

  function updateConnection() {
    connection.classList.toggle("offline", !navigator.onLine);
    connection.textContent = navigator.onLine
      ? "Online · redemption system available"
      : "Offline · do not serve from an unverified QR";
  }

  async function api(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || `Request failed (${response.status})`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  function tokenFrom(value) {
    const raw = String(value || "").trim();
    try {
      const parsed = new URL(raw);
      return parsed.searchParams.get("t") || parsed.searchParams.get("token") || "";
    } catch {}
    return /^[A-Za-z0-9_-]{32,96}$/.test(raw) ? raw : "";
  }

  function resultMarkup(ticket, mode = ticket.status) {
    const redeemed = mode === "redeemed";
    const valid = mode === "valid";
    return `
      <div class="staff-result ${escaped(mode)}">
        <h2>${redeemed ? "STOP — already served" : valid ? "Valid party" : "Ticket problem"}</h2>
        <div class="party-callout">PARTY OF ${escaped(ticket.partySize)}</div>
        <dl>
          <dt>Name</dt><dd>${escaped(ticket.name)}</dd>
          <dt>Phone</dt><dd>${ticket.phoneLast4 ? `ends in ${escaped(ticket.phoneLast4)}` : "not available"}</dd>
          <dt>Email</dt><dd>${escaped(ticket.emailMasked || "not available")}</dd>
          <dt>Code</dt><dd>${escaped(ticket.backupCode)}</dd>
          ${redeemed ? `<dt>Redeemed</dt><dd>${escaped(formattedTime(ticket.redeemedAt))}</dd>` : ""}
        </dl>
        ${valid ? `
          <p class="ticket-rule"><strong>Confirm all ${escaped(ticket.partySize)} people are present.</strong> Press redeem only as their food is handed out. Then stamp or wristband everyone.</p>
          <div class="ticket-actions">
            <button class="ticket-button green" id="redeem-party" type="button">Redeem party of ${escaped(ticket.partySize)}</button>
            <button class="ticket-button secondary" id="cancel-ticket" type="button">Cancel</button>
          </div>` : `
          <p class="ticket-rule"><strong>Do not serve this QR again.</strong> Ask the event lead before making any manual exception.</p>
          <div class="ticket-actions"><button class="ticket-button secondary" id="next-ticket" type="button">Scan next party</button></div>`}
      </div>`;
  }

  function renderError(message) {
    activeToken = "";
    result.innerHTML = `
      <div class="staff-result error">
        <h2>Ticket not verified</h2>
        <p>${escaped(message)}</p>
        <p class="ticket-rule">Do not serve from this QR. Try manual lookup or ask the event lead.</p>
        <div class="ticket-actions"><button class="ticket-button secondary" id="next-ticket" type="button">Try next ticket</button></div>
      </div>`;
    document.querySelector("#next-ticket")?.addEventListener("click", resetScanner);
  }

  async function loadTicket(token) {
    if (!token || handlingScan) return;
    handlingScan = true;
    activeToken = token;
    searchResults.innerHTML = "";
    result.innerHTML = `<div class="staff-result"><h2>Checking ticket…</h2></div>`;
    try {
      scanner?.pause(true);
    } catch {}
    try {
      const payload = await api(`/api/staff-ticket?token=${encodeURIComponent(token)}`);
      result.innerHTML = resultMarkup(payload.ticket);
      if (payload.ticket.status === "valid") {
        document.querySelector("#redeem-party")?.addEventListener("click", redeemActive);
        document.querySelector("#cancel-ticket")?.addEventListener("click", resetScanner);
      } else {
        document.querySelector("#next-ticket")?.addEventListener("click", resetScanner);
      }
    } catch (error) {
      if (error.status === 401) return showLogin(true);
      renderError(error.message);
    } finally {
      handlingScan = false;
    }
  }

  async function redeemActive() {
    const button = document.querySelector("#redeem-party");
    if (!activeToken || !button) return;
    button.disabled = true;
    button.textContent = "Redeeming…";
    try {
      const payload = await api("/api/redeem", {
        method: "POST",
        body: JSON.stringify({ token: activeToken })
      });
      result.innerHTML = `
        <div class="staff-result valid">
          <h2>REDEEMED — serve now</h2>
          <div class="party-callout">SERVE ${escaped(payload.ticket.partySize)}</div>
          <p><strong>${escaped(payload.ticket.name)}</strong></p>
          <p class="ticket-rule">Food can be handed out now. Stamp or wristband every person in this party before they leave the handoff area.</p>
          <div class="ticket-actions"><button class="ticket-button green" id="next-ticket" type="button">Scan next party</button></div>
        </div>`;
      document.querySelector("#next-ticket")?.addEventListener("click", resetScanner);
    } catch (error) {
      if (error.status === 409 && error.payload?.ticket) {
        result.innerHTML = resultMarkup(error.payload.ticket, "redeemed");
        document.querySelector("#next-ticket")?.addEventListener("click", resetScanner);
      } else if (error.status === 401) {
        showLogin(true);
      } else {
        renderError(error.message);
      }
    }
  }

  function resetScanner() {
    activeToken = "";
    handlingScan = false;
    result.innerHTML = "";
    try {
      scanner?.resume();
    } catch {}
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startScanner() {
    if (scanner || typeof Html5QrcodeScanner === "undefined") return;
    scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: (width, height) => {
          const edge = Math.floor(Math.min(width, height) * 0.72);
          return { width: edge, height: edge };
        },
        rememberLastUsedCamera: true,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA, Html5QrcodeScanType.SCAN_TYPE_FILE]
      },
      false
    );
    scanner.render(
      (decodedText) => {
        const token = tokenFrom(decodedText);
        if (!token) return renderError("That QR code is not an Island Boy event pass.");
        loadTicket(token);
      },
      () => {}
    );
  }

  function showTools() {
    loginForm.classList.add("hidden");
    tools.classList.remove("hidden");
    startScanner();
  }

  function showLogin(expired = false) {
    tools.classList.add("hidden");
    loginForm.classList.remove("hidden");
    loginStatus.textContent = expired ? "Your staff session expired. Enter the PIN again." : "";
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = loginForm.querySelector("button");
    const pin = new FormData(loginForm).get("pin");
    button.disabled = true;
    loginStatus.textContent = "Signing in…";
    try {
      await api("/api/staff-login", { method: "POST", body: JSON.stringify({ pin }) });
      loginForm.reset();
      loginStatus.textContent = "";
      showTools();
    } catch (error) {
      loginStatus.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });

  searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = String(new FormData(searchForm).get("query") || "").trim();
    const directToken = tokenFrom(query);
    if (directToken) return loadTicket(directToken);
    searchResults.innerHTML = "<p>Searching…</p>";
    try {
      const payload = await api(`/api/staff-search?q=${encodeURIComponent(query)}`);
      if (!payload.matches.length) {
        searchResults.innerHTML = "<p>No matching RSVP found.</p>";
        return;
      }
      searchResults.innerHTML = payload.matches.map((ticket, index) => `
        <button class="search-result" type="button" data-index="${index}">
          <strong>${escaped(ticket.name)} · Party of ${escaped(ticket.partySize)}</strong>
          <span>${escaped(ticket.emailMasked || "")}${ticket.phoneLast4 ? ` · phone ends ${escaped(ticket.phoneLast4)}` : ""} · ${escaped(ticket.backupCode)}</span>
        </button>`).join("");
      searchResults.querySelectorAll("[data-index]").forEach((button) => {
        button.addEventListener("click", () => loadTicket(payload.matches[Number(button.dataset.index)].token));
      });
    } catch (error) {
      if (error.status === 401) return showLogin(true);
      searchResults.innerHTML = `<p>${escaped(error.message)}</p>`;
    }
  });

  addEventListener("online", updateConnection);
  addEventListener("offline", updateConnection);
  updateConnection();
  api("/api/staff-session")
    .then((payload) => payload.authenticated ? showTools() : showLogin())
    .catch(() => showLogin());
})();
