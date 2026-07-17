(() => {
  "use strict";

  const measurementId = "G-X9YN3PDL0N";
  const consentKey = "island-boy-analytics-consent-v1";
  const privacySignal = navigator.globalPrivacyControl === true || navigator.doNotTrack === "1";
  let consent = null;
  let analyticsLoaded = false;

  try { consent = localStorage.getItem(consentKey); } catch { consent = null; }
  if (privacySignal) consent = "denied";

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
  window.gtag("consent", "default", {
    analytics_storage: consent === "granted" ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500
  });
  window.gtag("set", "ads_data_redaction", true);

  function loadAnalytics() {
    if (consent !== "granted" || analyticsLoaded) return;
    analyticsLoaded = true;
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      send_page_view: true
    });
    const tag = document.createElement("script");
    tag.async = true;
    tag.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(tag);
  }

  function saveConsent(value) {
    consent = value;
    try { localStorage.setItem(consentKey, value); } catch {}
    window.gtag("consent", "update", { analytics_storage: value });
    loadAnalytics();
    document.getElementById("analytics-consent")?.remove();
  }

  function track(name, params = {}) {
    if (consent !== "granted") return false;
    window.gtag("event", name, { page_path: location.pathname, ...params });
    return true;
  }

  window.islandBoyAnalytics = { track, consent: () => consent };
  loadAnalytics();

  function showConsent() {
    if (consent || privacySignal || document.getElementById("analytics-consent")) return;
    const banner = document.createElement("section");
    banner.id = "analytics-consent";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Analytics preference");
    banner.innerHTML = `
      <style>
        #analytics-consent{position:fixed;z-index:99999;left:16px;right:16px;bottom:16px;max-width:760px;margin:auto;padding:18px;border:1px solid rgba(255,189,53,.75);border-radius:18px;background:#110700;color:#fff8ec;box-shadow:0 18px 60px rgba(0,0,0,.48);font:15px/1.45 Inter,Arial,sans-serif}
        #analytics-consent p{margin:0 0 14px}#analytics-consent a{color:#ffbd35;text-decoration:underline}#analytics-consent .consent-actions{display:flex;gap:10px;flex-wrap:wrap}
        #analytics-consent button{border:1px solid #ffbd35;border-radius:999px;padding:10px 18px;font-weight:800;cursor:pointer}#analytics-consent .accept{background:#ffbd35;color:#180900}#analytics-consent .decline{background:transparent;color:#fff8ec}
      </style>
      <p>May we use privacy-conscious analytics to improve the menu, ordering and catering experience? Advertising storage stays off. Read our <a href="/privacy.html">privacy notice</a>.</p>
      <div class="consent-actions"><button class="accept" type="button">Allow analytics</button><button class="decline" type="button">No thanks</button></div>`;
    banner.querySelector(".accept").addEventListener("click", () => saveConsent("granted"));
    banner.querySelector(".decline").addEventListener("click", () => saveConsent("denied"));
    document.body.appendChild(banner);
  }

  function setupEvents() {
    showConsent();
    document.addEventListener("click", (event) => {
      const link = event.target.closest("a[href]");
      if (!link) return;
      const rawHref = link.getAttribute("href") || "";
      const href = link.href;
      const text = (link.textContent || "").trim().slice(0, 80);
      if (href.startsWith("tel:")) track("phone_click", { link_url: href, link_text: text });
      else if (href.startsWith("sms:")) track("order_click", { link_url: "sms", link_text: text });
      else if (/contact|catering|book/i.test(rawHref + " " + text)) track("catering_click", { link_url: href, link_text: text });
      else if (/order/i.test(rawHref + " " + text)) track("order_click", { link_url: href, link_text: text });
      else if (/menu|#menu/i.test(rawHref + " " + text)) track("menu_click", { link_url: href, link_text: text });
    });
    document.querySelectorAll("[data-reset-analytics-consent]").forEach((button) => {
      button.addEventListener("click", () => {
        try { localStorage.removeItem(consentKey); } catch {}
        location.reload();
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setupEvents, { once: true });
  else setupEvents();
})();
