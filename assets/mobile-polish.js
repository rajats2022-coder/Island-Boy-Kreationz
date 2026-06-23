/**
 * mobile-polish.js — Island Boy nav behavior.
 * Wires the desktop dropdowns (Catering / Locations / About) and builds the
 * grouped mobile menu. Injects its own critical CSS so the menu can never
 * render as unstyled links, even on a page missing site-shell.css.
 */
(function () {
  if (window.__ibShellInit) return;
  window.__ibShellInit = true;

  var nav = document.querySelector(".nav");
  if (!nav) return;

  /* critical fallback styles (site-shell.css normally wins; this is a safety net) */
  if (!document.getElementById("ib-shell-fallback")) {
    var style = document.createElement("style");
    style.id = "ib-shell-fallback";
    style.textContent =
      ".ib-mobile-panel{position:fixed;top:0;left:0;right:0;bottom:0;z-index:65;display:none;flex-direction:column;padding:calc(96px + env(safe-area-inset-top)) 18px calc(28px + env(safe-area-inset-bottom));background:rgba(13,5,0,.985);overflow-y:auto;opacity:0;visibility:hidden;transform:translateY(-8px);transition:opacity .2s ease,transform .2s ease,visibility .2s ease}" +
      ".ib-mobile-panel.open{opacity:1;visibility:visible;transform:translateY(0)}" +
      ".ib-mobile-panel .ib-mp-primary{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px}" +
      ".ib-mobile-panel .ib-mp-primary a{display:flex;align-items:center;justify-content:center;min-height:52px;border-radius:999px;font-weight:1000;font-size:15px;color:#160805;background:#ffbd35;text-decoration:none}" +
      ".ib-mobile-panel .ib-mp-primary a:last-child{background:linear-gradient(135deg,#005aa9,#00a7a7);color:#fffdf6}" +
      ".ib-mobile-panel .ib-mp-toggle{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:50px;margin:0 0 6px;padding:13px 15px;border:1px solid rgba(255,232,184,.14);border-radius:16px;background:rgba(255,248,236,.06);color:#ffbd35;font-size:11px;font-weight:1000;letter-spacing:.16em;text-transform:uppercase;text-align:left;cursor:pointer}" +
      ".ib-mobile-panel .ib-mp-toggle:after{content:'+';display:grid;place-items:center;width:24px;height:24px;border-radius:999px;background:rgba(255,189,53,.18);color:#fff8ec;font-size:17px;line-height:1;letter-spacing:0}" +
      ".ib-mobile-panel .ib-mp-group.open .ib-mp-toggle:after{content:'-'}" +
      ".ib-mobile-panel .ib-mp-links{display:grid;grid-template-columns:1fr 1fr;gap:6px}" +
      ".ib-mobile-panel .ib-mp-links[hidden]{display:none!important}" +
      ".ib-mobile-panel .ib-mp-links.ib-mp-1col{grid-template-columns:1fr}" +
      ".ib-mobile-panel .ib-mp-links a{display:flex;align-items:center;min-height:48px;padding:10px 14px;border-radius:14px;background:rgba(255,248,236,.07);color:#fff8ec;font-weight:800;font-size:14.5px;text-decoration:none}" +
      ".mobile-nav-toggle{display:none;align-items:center;justify-content:center;width:44px;height:44px;border:1px solid rgba(255,232,184,.32);border-radius:999px;background:rgba(255,248,236,.08);color:#fff8ec;font-size:19px;cursor:pointer}" +
      "@media(max-width:920px){.topbar .links{display:none!important}.mobile-nav-toggle{display:inline-flex}body.ib-menu-open{overflow:hidden}.ib-mobile-panel{display:flex}}" +
      "@media(min-width:921px){.ib-mobile-panel,.mobile-nav-toggle{display:none!important}}";
    document.head.appendChild(style);
  }

  /* remove any legacy injected panel */
  document.querySelectorAll(".mobile-nav-panel").forEach(function (n) { n.remove(); });

  /* ---------- desktop dropdowns ---------- */
  var dropdowns = Array.prototype.slice.call(document.querySelectorAll(".nav-dropdown"));

  function closeDropdowns(except) {
    dropdowns.forEach(function (d) {
      if (d === except) return;
      d.classList.remove("open");
      var b = d.querySelector(".nav-dropdown-toggle");
      if (b) b.setAttribute("aria-expanded", "false");
    });
  }

  dropdowns.forEach(function (dropdown) {
    var button = dropdown.querySelector(".nav-dropdown-toggle");
    if (!button) return;

    button.addEventListener("click", function (event) {
      event.preventDefault();
      var open = dropdown.classList.toggle("open");
      closeDropdowns(dropdown);
      button.setAttribute("aria-expanded", String(open));
    });

    dropdown.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      dropdown.classList.remove("open");
      button.setAttribute("aria-expanded", "false");
      button.focus();
    });

    dropdown.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        dropdown.classList.remove("open");
        button.setAttribute("aria-expanded", "false");
      });
    });
  });

  /* ---------- mobile menu ---------- */
  var button = document.querySelector(".mobile-nav-toggle");
  if (!button) {
    button = document.createElement("button");
    button.className = "mobile-nav-toggle";
    button.type = "button";
    button.setAttribute("aria-label", "Open navigation");
    button.textContent = "☰";
    nav.appendChild(button);
  }
  button.setAttribute("aria-expanded", "false");

  var panel = document.createElement("nav");
  panel.className = "ib-mobile-panel";
  panel.setAttribute("aria-label", "Mobile navigation");

  var GROUPS = [
    { primary: [["Order Now", "order.html"], ["Book Catering", "contact.html#lead-form"]] },
    { label: "Explore", cols: 2, links: [
      ["Menu", "index.html#menu"], ["Our Story", "about.html"],
      ["Gallery", "gallery.html"], ["Blog", "blog.html"],
      ["FAQ", "faq.html"], ["Contact", "contact.html"]
    ] },
    { label: "Catering", cols: 1, links: [
      ["All Catering Services", "services.html"],
      ["Food Truck Catering", "food-truck-catering-nc.html"],
      ["Oxtail Catering", "oxtail-catering-nc.html"],
      ["Private Party Catering", "private-party-catering-nc.html"],
      ["Office Lunch Catering", "office-lunch-catering-nc.html"],
      ["Church & Community Events", "church-community-event-catering-nc.html"],
      ["Party Trays & Drop-Off", "tray-catering-nc.html"]
    ] },
    { label: "Service Areas", cols: 2, links: [
      ["All Service Areas", "service-areas.html"],
      ["Charlotte", "catering-charlotte-nc.html"],
      ["Concord", "catering-concord-nc.html"],
      ["Matthews", "catering-matthews-nc.html"],
      ["Huntersville", "catering-huntersville-nc.html"],
      ["Gastonia", "catering-gastonia-nc.html"],
      ["Raleigh", "catering-raleigh-nc.html"],
      ["Greensboro", "catering-greensboro-nc.html"]
    ] }
  ];

  function closePanel() {
    panel.classList.remove("open");
    document.body.classList.remove("ib-menu-open");
    button.setAttribute("aria-expanded", "false");
    button.textContent = "☰";
    button.setAttribute("aria-label", "Open navigation");
    panel.querySelectorAll(".ib-mp-group.open").forEach(function (group) {
      var toggle = group.querySelector(".ib-mp-toggle");
      var list = group.querySelector(".ib-mp-links");
      group.classList.remove("open");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
      if (list) list.hidden = true;
    });
  }

  GROUPS.forEach(function (group) {
    if (group.primary) {
      var row = document.createElement("div");
      row.className = "ib-mp-primary";
      group.primary.forEach(function (item) {
        var a = document.createElement("a");
        a.href = item[1];
        a.textContent = item[0];
        a.addEventListener("click", closePanel);
        row.appendChild(a);
      });
      panel.appendChild(row);
      return;
    }
    var wrap = document.createElement("div");
    wrap.className = "ib-mp-group";
    var id = "ib-mp-group-" + group.label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    var toggle = document.createElement("button");
    toggle.className = "ib-mp-toggle";
    toggle.type = "button";
    toggle.textContent = group.label;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", id);
    wrap.appendChild(toggle);
    var list = document.createElement("div");
    list.id = id;
    list.className = "ib-mp-links" + (group.cols === 1 ? " ib-mp-1col" : "");
    list.hidden = true;
    group.links.forEach(function (item) {
      var a = document.createElement("a");
      a.href = item[1];
      a.textContent = item[0];
      a.addEventListener("click", closePanel);
      list.appendChild(a);
    });
    toggle.addEventListener("click", function () {
      var open = wrap.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
      list.hidden = !open;
    });
    wrap.appendChild(list);
    panel.appendChild(wrap);
  });

  button.addEventListener("click", function () {
    var open = panel.classList.toggle("open");
    document.body.classList.toggle("ib-menu-open", open);
    button.setAttribute("aria-expanded", String(open));
    button.textContent = open ? "×" : "☰";
    button.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  });

  document.addEventListener("click", function (event) {
    if (!event.target.closest(".nav-dropdown")) closeDropdowns();
    if (!panel.classList.contains("open")) return;
    if (panel.contains(event.target) || button.contains(event.target)) return;
    closePanel();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && panel.classList.contains("open")) {
      closePanel();
      button.focus();
    }
  });

  document.body.appendChild(panel);
})();
