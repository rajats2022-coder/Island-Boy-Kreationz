(function(){
  if (window.__islandBoyChatbotLoaded) return;
  window.__islandBoyChatbotLoaded = true;

  const PHONE = "980-785-8372";
  const PHONE_LINK = "tel:+19807858372";
  const EMAIL = "deonhenry756@gmail.com";
  const EMAIL_LINK = "mailto:deonhenry756@gmail.com";
  const INSTAGRAM = "https://www.instagram.com/islandboy_kreationz/";

  const actions = {
    order: { label: "Build an order", href: "order.html", style: "primary" },
    catering: { label: "Book catering", href: "contact.html#lead-form", style: "primary" },
    call: { label: "Call / text", href: PHONE_LINK, style: "dark" },
    menu: { label: "View menu", href: "index.html#menu" },
    faq: { label: "Read FAQ", href: "faq.html" },
    gallery: { label: "Food gallery", href: "gallery.html" },
    location: { label: "Get location", href: "index.html#location" },
    instagram: { label: "Instagram", href: INSTAGRAM, external: true },
    email: { label: "Email", href: EMAIL_LINK }
  };

  const responses = [
    {
      keys: ["cater", "event", "party", "wedding", "office", "church", "school", "corporate", "truck", "book", "booking", "quote", "tray", "trays"],
      text: "Yes, Island Boy Kreationz takes catering and food truck booking inquiries. For the fastest quote, send the event date, time, city/address, guest count, service style, and what food direction you want. Catering pricing depends on headcount, travel, menu, and service style.",
      actions: ["catering", "call", "menu"]
    },
    {
      keys: ["order", "online", "pickup", "cart", "buy", "checkout", "meal"],
      text: "You can start on the order page and build a bowl or plate with oxtail, wings, chopped chicken, shrimp, salmon, sides, cakes, and drinks. Payment checkout is still a production step, so call or text if you need live confirmation.",
      actions: ["order", "call", "menu"]
    },
    {
      keys: ["menu", "food", "serve", "oxtail", "oxtails", "wing", "wings", "chicken", "shrimp", "salmon", "side", "sides", "rice", "mac", "cheese", "cake", "drink", "lemonade"],
      text: "Popular menu directions include oxtail meals and bowls, wing meals and bowls, chopped chicken, shrimp bowls, salmon bowls, rice and peas, yellow rice, cabbage, candied yams, baked beans, mac and cheese, cornbread, cakes, and drinks.",
      actions: ["menu", "order", "gallery"]
    },
    {
      keys: ["price", "prices", "cost", "how much", "quote", "minimum", "budget"],
      text: "Walk-up/order items can be reviewed on the order page. Catering is custom because pricing depends on guest count, location, service window, travel, and menu. Send the details and Island Boy can quote the right setup.",
      actions: ["order", "catering", "call"]
    },
    {
      keys: ["hour", "hours", "open", "today", "when", "schedule", "hunter", "address", "location", "where", "directions", "amazon", "tuckaseegee"],
      text: "Home base is 6100 Hunter Ave, Charlotte, NC 28262. Posted hours are Tuesday through Friday, 2:30 PM to 8:30 PM. The site also notes an Amazon stop at 8000 Tuckaseegee Rd. For same-day confirmation, call or text first.",
      actions: ["location", "call", "order"]
    },
    {
      keys: ["pork", "halal", "allergy", "allergies", "diet", "vegan", "vegetarian"],
      text: "The site states that Island Boy Kreationz does not cook pork. For allergies, vegan/vegetarian needs, or strict dietary requirements, call or text before ordering so the team can confirm what is safe that day.",
      actions: ["call", "faq", "menu"]
    },
    {
      keys: ["city", "cities", "area", "areas", "charlotte", "concord", "greensboro", "raleigh", "durham", "cary", "gastonia", "huntersville", "kannapolis", "mooresville", "winston", "service"],
      text: "The site accepts North Carolina catering inquiries around Charlotte, Concord, Greensboro, Raleigh, Durham, Cary, Winston-Salem, High Point, Gastonia, Huntersville, Kannapolis, Mooresville, and nearby cities. Larger or farther events should send details for travel review.",
      actions: ["catering", "call", { label: "Service areas", href: "service-areas.html" }]
    },
    {
      keys: ["instagram", "social", "photo", "photos", "picture", "pictures", "gallery"],
      text: "You can check the food gallery for plated dishes and truck shots, or visit Instagram for the most current visuals and pop-up energy.",
      actions: ["gallery", "instagram", "order"]
    },
    {
      keys: ["contact", "phone", "number", "email", "text", "call", "owner", "deon"],
      text: "You can call or text Island Boy Kreationz at " + PHONE + " or email " + EMAIL + ". If you are planning an event, include date, time, address, guest count, and whether you need truck service or catering trays.",
      actions: ["call", "email", "catering"]
    }
  ];

  const fallback = {
    text: "I can help with ordering, menu questions, hours, location, no-pork info, catering, service areas, and how to contact Island Boy Kreationz. If this is a special request, call/text so the team can confirm directly.",
    actions: ["order", "catering", "call"]
  };

  function resolveAction(action) {
    if (typeof action === "string") return actions[action];
    return action;
  }

  function findResponse(input) {
    const q = input.toLowerCase();
    return responses.find((item) => item.keys.some((key) => q.includes(key))) || fallback;
  }

  function makeAction(action) {
    const item = resolveAction(action);
    const link = document.createElement("a");
    link.className = "ib-action" + (item.style ? " " + item.style : "");
    link.href = item.href;
    link.textContent = item.label;
    if (item.external) {
      link.target = "_blank";
      link.rel = "noopener";
    }
    return link;
  }

  function addMessage(body, role, text, responseActions) {
    const row = document.createElement("div");
    row.className = "ib-msg " + role;
    const bubble = document.createElement("div");
    bubble.className = "ib-msg-bubble";
    bubble.textContent = text;
    row.appendChild(bubble);
    if (responseActions && responseActions.length) {
      const actionRow = document.createElement("div");
      actionRow.className = "ib-actions";
      responseActions.map(makeAction).forEach((node) => actionRow.appendChild(node));
      row.appendChild(actionRow);
    }
    body.appendChild(row);
    body.scrollTop = body.scrollHeight;
  }

  function ask(question, body, input) {
    const clean = question.trim();
    if (!clean) return;
    addMessage(body, "user", clean);
    const response = findResponse(clean);
    window.setTimeout(() => addMessage(body, "bot", response.text, response.actions), 180);
    input.value = "";
  }

  function init() {
    const root = document.createElement("div");
    root.className = "ib-chat";
    root.innerHTML = '<button class="ib-chat-launcher" type="button" aria-expanded="false" aria-label="Open Island Boy assistant"><span class="ib-chat-launcher-icon">IB</span><span>Ask Island Boy<small>Order or catering help</small></span></button><section class="ib-chat-panel" aria-label="Island Boy Kreationz assistant"><div class="ib-chat-head"><span class="ib-chat-logo"><img src="assets/island-boy-logo.png" alt=""></span><div class="ib-chat-title"><strong>Island Boy Assistant</strong><span>Menu, orders, catering</span></div><button class="ib-chat-close" type="button" aria-label="Close assistant">x</button></div><div class="ib-chat-quick"><button class="ib-chip primary" type="button" data-question="I want to book catering">Book catering</button><button class="ib-chip" type="button" data-question="What is on the menu?">Menu</button><button class="ib-chip" type="button" data-question="How do I order?">Order</button><button class="ib-chip" type="button" data-question="What are the hours and location?">Hours</button></div><div class="ib-chat-body"></div><form class="ib-chat-form"><input class="ib-chat-input" type="text" autocomplete="off" placeholder="Ask about menu, catering, hours..."><button class="ib-chat-submit" type="submit">Send</button></form></section>';
    document.body.appendChild(root);

    const launcher = root.querySelector(".ib-chat-launcher");
    const close = root.querySelector(".ib-chat-close");
    const body = root.querySelector(".ib-chat-body");
    const form = root.querySelector(".ib-chat-form");
    const input = root.querySelector(".ib-chat-input");

    function setOpen(open) {
      root.classList.toggle("open", open);
      launcher.setAttribute("aria-expanded", String(open));
      if (open && !body.dataset.greeted) {
        body.dataset.greeted = "true";
        addMessage(body, "bot", "Hey, I can help you order, check the menu, find hours, or send the right catering details for Island Boy Kreationz.", ["order", "catering", "call"]);
      }
      if (open) window.setTimeout(() => input.focus(), 80);
    }

    launcher.addEventListener("click", () => setOpen(!root.classList.contains("open")));
    close.addEventListener("click", () => setOpen(false));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      ask(input.value, body, input);
    });
    root.querySelectorAll(".ib-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        setOpen(true);
        ask(chip.dataset.question || chip.textContent, body, input);
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
