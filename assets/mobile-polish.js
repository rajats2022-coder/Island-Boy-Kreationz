(function () {
  const nav = document.querySelector(".nav");
  const desktopLinks = document.querySelector(".links");
  if (!nav || !desktopLinks || document.querySelector(".mobile-nav-panel")) return;

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
    if (!panel.classList.contains("open")) return;
    if (panel.contains(event.target) || button.contains(event.target)) return;
    closePanel();
  });

  if (createdButton) nav.appendChild(button);
  document.body.appendChild(panel);
})();
