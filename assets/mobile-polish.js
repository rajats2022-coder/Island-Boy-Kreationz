(function () {
  const nav = document.querySelector(".nav");
  const desktopLinks = document.querySelector(".links");
  if (!nav || !desktopLinks || document.querySelector(".mobile-nav-toggle")) return;

  const button = document.createElement("button");
  button.className = "mobile-nav-toggle";
  button.type = "button";
  button.setAttribute("aria-label", "Open navigation");
  button.setAttribute("aria-expanded", "false");
  button.textContent = "☰";

  const panel = document.createElement("div");
  panel.className = "mobile-nav-panel";
  panel.setAttribute("aria-label", "Mobile navigation");

  desktopLinks.querySelectorAll("a").forEach((link) => {
    const clone = link.cloneNode(true);
    clone.addEventListener("click", () => {
      panel.classList.remove("open");
      button.setAttribute("aria-expanded", "false");
      button.textContent = "☰";
    });
    panel.appendChild(clone);
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

  nav.appendChild(button);
  document.body.appendChild(panel);
})();
