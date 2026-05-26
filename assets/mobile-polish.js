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

  const requiredLinks = [
    ["Home", "index.html"],
    ["Menu", "index.html#menu"],
    ["Order Now", "order.html"],
    ["Catering", "index.html#catering"],
    ["Gallery", "gallery.html"],
    ["Service Areas", "service-areas.html"],
    ["Blog", "blog.html"],
    ["FAQ", "faq.html"],
    ["Contact", "contact.html"],
  ];

  const seen = new Set();

  desktopLinks.querySelectorAll("a").forEach((link) => {
    const clone = link.cloneNode(true);
    const href = clone.getAttribute("href") || "";
    seen.add(href.replace(/^.\//, ""));
    clone.addEventListener("click", () => {
      panel.classList.remove("open");
      button.setAttribute("aria-expanded", "false");
      button.textContent = "☰";
    });
    panel.appendChild(clone);
  });

  requiredLinks.forEach(([label, href]) => {
    if (seen.has(href)) return;
    const link = document.createElement("a");
    link.href = href;
    link.textContent = label;
    link.addEventListener("click", () => {
      panel.classList.remove("open");
      button.setAttribute("aria-expanded", "false");
      button.textContent = "☰";
    });
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
    panel.classList.remove("open");
    button.setAttribute("aria-expanded", "false");
    button.textContent = "☰";
  });

  if (createdButton) nav.appendChild(button);
  document.body.appendChild(panel);
})();
