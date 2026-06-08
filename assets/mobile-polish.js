(function () {
  const nav = document.querySelector(".nav");
  const desktopLinks = document.querySelector(".links");
  if (!nav || !desktopLinks || document.querySelector(".mobile-nav-panel")) return;

  if (!document.getElementById("ib-nav-dropdown-fallback")) {
    const style = document.createElement("style");
    style.id = "ib-nav-dropdown-fallback";
    style.textContent = ".nav-dropdown{position:relative;display:inline-flex;align-items:center}.nav-dropdown-toggle{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:40px;padding:0;border:0;background:transparent;color:#fff3d4;font:inherit;font-weight:900;line-height:1;white-space:nowrap;cursor:pointer}.nav-dropdown-toggle span{font-size:11px;transform:translateY(1px)}.nav-dropdown-menu{position:absolute;top:calc(100% + 14px);right:0;z-index:150;display:grid;grid-template-columns:1fr 1fr;gap:7px;width:min(560px,calc(100vw - 32px));padding:12px;border:1px solid rgba(255,232,184,.24);border-radius:18px;background:rgba(17,7,0,.98);box-shadow:0 24px 70px rgba(0,0,0,.45);opacity:0;visibility:hidden;transform:translateY(-6px);transition:opacity 160ms ease,transform 160ms ease,visibility 160ms ease}.nav-dropdown:hover .nav-dropdown-menu,.nav-dropdown:focus-within .nav-dropdown-menu,.nav-dropdown.open .nav-dropdown-menu{opacity:1;visibility:visible;transform:translateY(0)}.nav-dropdown-menu a{display:flex;align-items:center;min-height:38px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.07);color:#fff8ec!important}.nav-dropdown-menu a:hover{background:rgba(255,189,53,.2)}@media(max-width:920px){.links{display:none!important}}";
    document.head.appendChild(style);
  }

  const dropdown = desktopLinks.querySelector(".nav-dropdown");
  const dropdownButton = desktopLinks.querySelector(".nav-dropdown-toggle");
  if (dropdown && dropdownButton) {
    dropdownButton.addEventListener("click", (event) => {
      event.preventDefault();
      const open = dropdown.classList.toggle("open");
      dropdownButton.setAttribute("aria-expanded", String(open));
    });

    dropdown.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      dropdown.classList.remove("open");
      dropdownButton.setAttribute("aria-expanded", "false");
      dropdownButton.focus();
    });

    dropdown.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        dropdown.classList.remove("open");
        dropdownButton.setAttribute("aria-expanded", "false");
      });
    });
  }

  let button = document.querySelector(".mobile-nav-toggle");
  const createdButton = !button;
  if (!button) {
    button = document.createElement("button");
    button.className = "mobile-nav-toggle";
    button.type = "button";
    button.setAttribute("aria-label", "Open navigation");
    button.textContent = "☰";
  }
  button.setAttribute("aria-expanded", "false");

  const panel = document.createElement("div");
  panel.className = "mobile-nav-panel";
  panel.setAttribute("aria-label", "Mobile navigation");

  const mobileLinks = [
    ["Menu", "index.html#menu"],
    ["Order Now", "order.html", true],
    ["Book Catering", "contact.html#lead-form", true],
    ["Services", "services.html"],
    ["Food Truck Catering", "food-truck-catering-nc.html"],
    ["Oxtail Catering", "oxtail-catering-nc.html"],
    ["Private Parties", "private-party-catering-nc.html"],
    ["Office Lunch", "office-lunch-catering-nc.html"],
    ["Church & Community", "church-community-event-catering-nc.html"],
    ["About", "about.html"],
    ["Gallery", "gallery.html"],
    ["Service Areas", "service-areas.html"],
    ["Blog", "blog.html"],
    ["FAQ", "faq.html"],
    ["Contact", "contact.html"],
  ];

  function closePanel() {
    panel.classList.remove("open");
    button.setAttribute("aria-expanded", "false");
    button.textContent = "☰";
  }

  mobileLinks.forEach(([label, href, primary]) => {
    const link = document.createElement("a");
    link.href = href;
    link.textContent = label;
    if (primary) link.dataset.mobilePrimary = "true";
    link.addEventListener("click", closePanel);
    panel.appendChild(link);
  });

  button.addEventListener("click", () => {
    const open = panel.classList.toggle("open");
    button.setAttribute("aria-expanded", String(open));
    button.textContent = open ? "×" : "☰";
  });

  document.addEventListener("click", (event) => {
    if (dropdown && dropdownButton && !dropdown.contains(event.target)) {
      dropdown.classList.remove("open");
      dropdownButton.setAttribute("aria-expanded", "false");
    }
    if (!panel.classList.contains("open")) return;
    if (panel.contains(event.target) || button.contains(event.target)) return;
    closePanel();
  });

  if (createdButton) nav.appendChild(button);
  document.body.appendChild(panel);
})();
