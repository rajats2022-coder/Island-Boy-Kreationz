(function(){
  if (window.__islandBoyChatbotLoaded) return;
  window.__islandBoyChatbotLoaded = true;

  const PHONE = "980-785-8372";
  const PHONE_LINK = "tel:+19807858372";
  const SMS_LINK = "sms:+19807858372";
  const EMAIL = "deonhenry756@gmail.com";
  const EMAIL_LINK = "mailto:deonhenry756@gmail.com";
  const INSTAGRAM = "https://www.instagram.com/islandboy_kreationz/";
  const MAPS = "https://www.google.com/maps?q=6100%20Hunter%20Ave%20Charlotte%20NC%2028262";

  const state = {
    lastIntent: "",
    lead: {}
  };

  const business = {
    address: "6100 Hunter Ave, Charlotte, NC 28262",
    regularHours: "Tuesday through Friday, 2:30 PM to 8:30 PM",
    amazonHours: "Tuesday through Saturday, 9 PM to 11 PM",
    menu: [
      "oxtail meals and bowls",
      "wing meals and bowls",
      "chopped chicken",
      "curry chicken",
      "shrimp bowls",
      "salmon",
      "beef ribs",
      "rice and peas",
      "yellow rice",
      "cabbage",
      "candied yams",
      "baked beans",
      "mac and cheese",
      "cornbread",
      "homemade cakes",
      "desserts",
      "drinks"
    ],
    serviceAreas: "Charlotte, Concord, Greensboro, Raleigh, Durham, Cary, Winston-Salem, High Point, Gastonia, Huntersville, Kannapolis, Mooresville, and nearby North Carolina cities"
  };

  const actions = {
    order: { label: "Order now", href: "order.html", style: "primary" },
    catering: { label: "Book catering", href: "contact.html#lead-form", style: "primary" },
    call: { label: "Call", href: PHONE_LINK, style: "dark" },
    text: { label: "Text now", href: SMS_LINK, style: "dark" },
    menu: { label: "View menu", href: "index.html#menu" },
    cateringMenu: { label: "Catering menu", href: "index.html#menu" },
    faq: { label: "Read FAQ", href: "faq.html" },
    blog: { label: "Read blog", href: "blog.html" },
    gallery: { label: "Food gallery", href: "gallery.html" },
    location: { label: "Location", href: "index.html#location" },
    maps: { label: "Open map", href: MAPS, external: true },
    serviceAreas: { label: "Service areas", href: "service-areas.html" },
    instagram: { label: "DM Instagram", href: INSTAGRAM, external: true },
    email: { label: "Email", href: EMAIL_LINK }
  };

  const intentRules = [
    ["greeting", ["hi", "hello", "hey", "yo", "good morning", "good afternoon", "good evening", "whats up", "what's up", "sup"]],
    ["menu", ["menu", "food", "serve", "oxtail", "oxtails", "wing", "wings", "chicken", "curry", "shrimp", "salmon", "beef", "ribs", "dessert", "desserts", "side", "sides", "rice", "mac", "cheese", "cake", "drink", "lemonade", "island", "caribbean", "soul food"]],
    ["today", ["today", "tonight", "right now", "where are you", "where yall", "where y'all", "where u", "where you at", "location today", "pull up", "popup", "pop up", "schedule", "open now"]],
    ["hoursLocation", ["hour", "hours", "open", "closed", "when", "hunter", "address", "location", "where", "directions", "amazon", "tuckaseegee", "6100", "charlotte"]],
    ["catering", ["cater", "catering", "event", "events", "party", "wedding", "office", "church", "school", "corporate", "truck", "food truck", "book", "booking", "quote", "tray", "trays", "function", "festival", "birthday", "graduation"]],
    ["order", ["order", "online", "pickup", "cart", "buy", "checkout", "meal", "plate", "plates", "bowl", "bowls", "get food", "doordash"]],
    ["price", ["price", "prices", "pricing", "cost", "how much", "quote", "minimum", "budget", "cheap", "expensive"]],
    ["dietary", ["pork", "halal", "allergy", "allergies", "diet", "vegan", "vegetarian", "gluten", "safe"]],
    ["serviceAreas", ["city", "cities", "area", "areas", "concord", "greensboro", "raleigh", "durham", "cary", "gastonia", "huntersville", "kannapolis", "mooresville", "winston", "high point", "service area", "travel"]],
    ["socialGallery", ["instagram", "social", "photo", "photos", "picture", "pictures", "gallery", "video", "facebook", "tiktok"]],
    ["faqBlog", ["faq", "question", "questions", "blog", "article", "learn", "read", "information", "info"]],
    ["contact", ["contact", "phone", "number", "email", "text", "call", "owner", "deon", "message", "talk", "dm"]],
    ["thanks", ["thanks", "thank you", "appreciate", "okay", "ok", "cool", "bet"]]
  ];

  const responseMap = {
    greeting: {
      text: "Hey, welcome to Island Boy Kreationz. Ask me like a normal conversation: menu, where the truck is today, hours, ordering, catering, service areas, or how to reach the team.",
      actions: ["menu", "location", "order", "catering"]
    },
    help: {
      text: "I can guide you to the right next step. For food now, use Order Now or call/text. For an event, send the date, time, address, guest count, and whether you want the truck or trays. For same-day location, check Instagram or text before driving.",
      actions: ["order", "catering", "text", "instagram"]
    },
    menu: {
      text: "The menu includes " + business.menu.join(", ") + ". Availability can rotate, so use the menu page for the full view and text/call for same-day confirmation.",
      actions: ["menu", "order", "text", "gallery"]
    },
    today: {
      text: todayLocationText(),
      actions: ["instagram", "text", "maps", "location"]
    },
    hoursLocation: {
      text: "Home base is " + business.address + ". Posted hours are " + business.regularHours + ". The Amazon stop runs " + business.amazonHours + ". Saturday location can change, so check Instagram or text before driving.",
      actions: ["maps", "location", "text", "instagram"]
    },
    catering: {
      text: "Yes, Island Boy Kreationz takes catering and food truck booking inquiries. Send the event date, time, city/address, guest count, service style, and food direction. If you tell me those details here, I can help you make a clean message to send.",
      actions: ["catering", "text", "cateringMenu"]
    },
    order: {
      text: "For individual food, start with Order Now or text/call for same-day availability. The site can guide plates and bowls, but the team should confirm timing, rotating items, and pickup details.",
      actions: ["order", "text", "menu"]
    },
    price: {
      text: "Public pricing is limited because availability and catering quotes depend on the order, headcount, location, service window, travel, and menu direction. For a real quote, send the details and the team can confirm.",
      actions: ["catering", "text", "order"]
    },
    dietary: {
      text: "The site states that Island Boy Kreationz does not cook pork. For allergies, vegan/vegetarian needs, gluten concerns, or strict dietary requirements, text/call before ordering so the team can confirm what is safe that day.",
      actions: ["text", "faq", "menu"]
    },
    serviceAreas: {
      text: "For catering, Island Boy Kreationz accepts inquiries around " + business.serviceAreas + ". Larger or farther events should send details for travel review.",
      actions: ["serviceAreas", "catering", "text"]
    },
    socialGallery: {
      text: "Use the gallery for food and truck photos. Use Instagram for the most current updates, schedule changes, supporter benefits, and the Island Boy journey.",
      actions: ["gallery", "instagram", "order"]
    },
    faqBlog: {
      text: "The FAQ covers ordering, catering, locations, dietary notes, and what to send for quotes. The blog has deeper catering guidance for Charlotte and nearby North Carolina cities.",
      actions: ["faq", "blog", "catering"]
    },
    contact: {
      text: "You can call Island Boy Kreationz at " + PHONE + ", text the same number, DM Instagram, or email " + EMAIL + ". For events, include date, time, address, guest count, and truck or tray preference.",
      actions: ["text", "call", "instagram", "email"]
    },
    thanks: {
      text: "You got it. If you are ready to move, Order Now starts food requests, Book Catering starts event inquiries, and Text Now is best for same-day questions.",
      actions: ["order", "catering", "text"]
    }
  };

  const fallback = {
    text: "I might not have that exact answer yet, but I can still help route you. For live location or sold-out questions, text or DM Instagram. For menu, ordering, catering, hours, service areas, FAQ, and photos, use the buttons below.",
    actions: ["text", "instagram", "menu", "catering"]
  };

  function normalize(input) {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9\s']/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function todayLocationText() {
    const day = new Date().getDay();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const today = days[day];

    if (day >= 2 && day <= 5) {
      return "Today is " + today + ". The posted home-base schedule is " + business.address + " from 2:30 PM to 8:30 PM, with the Amazon stop from 9 PM to 11 PM. I cannot see live sell-outs or last-minute movement yet, so text or check Instagram before driving.";
    }

    if (day === 6) {
      return "Today is Saturday. The Amazon stop is posted for 9 PM to 11 PM, but Saturday daytime location can change. For the clearest answer, text the team or DM/check Instagram before driving.";
    }

    return "Today is " + today + ". I do not have a posted regular truck window for today in the site data. Text or DM Instagram for same-day location, sold-out status, or special pop-up updates.";
  }

  function scoreIntent(input, keys) {
    const q = normalize(input);
    return keys.reduce((total, key) => {
      const normalizedKey = normalize(key);
      if (!normalizedKey) return total;
      if (q === normalizedKey) return total + 8;
      if (q.includes(normalizedKey)) return total + Math.min(6, normalizedKey.length / 3);
      return total;
    }, 0);
  }

  function detectIntent(input) {
    const q = normalize(input);
    if (!q) return "fallback";

    if (state.lastIntent === "catering" && looksLikeLeadDetail(q)) return "leadDetails";

    let bestIntent = "";
    let bestScore = 0;

    intentRules.forEach(([intent, keys]) => {
      const score = scoreIntent(q, keys);
      if (score > bestScore) {
        bestIntent = intent;
        bestScore = score;
      }
    });

    return bestScore > 0 ? bestIntent : "fallback";
  }

  function looksLikeLeadDetail(q) {
    return /\b\d{1,4}\b/.test(q) || /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|people|guests|guest|pm|am|at|in|truck|tray|trays)\b/.test(q);
  }

  function updateLead(input) {
    const q = normalize(input);
    const guestMatch = q.match(/\b(\d{1,4})\s*(people|person|guests|guest|plates|meals)?\b/);
    const timeMatch = input.match(/\b\d{1,2}(:\d{2})?\s*(am|pm)\b/i);
    const dayMatch = input.match(/\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);

    if (guestMatch) state.lead.guests = guestMatch[0];
    if (timeMatch) state.lead.time = timeMatch[0];
    if (dayMatch) state.lead.date = dayMatch[0];
    if (/\btruck|food truck|pull up\b/.test(q)) state.lead.service = "food truck service";
    if (/\btray|trays|drop off|pickup|pick up\b/.test(q)) state.lead.service = "catering trays";
    const cityMatch = q.match(/\b(charlotte|concord|greensboro|raleigh|durham|cary|gastonia|huntersville|kannapolis|mooresville|winston(?: salem)?|high point)\b/);
    if (cityMatch) {
      state.lead.location = cityMatch[1].replace(/\b\w/g, (letter) => letter.toUpperCase());
    } else if (/\b(address|venue|street| ave| avenue| rd| road| dr| drive| st| street)\b/.test(q)) {
      state.lead.location = input;
    }
  }

  function missingLeadFields() {
    const missing = [];
    if (!state.lead.date) missing.push("date");
    if (!state.lead.time) missing.push("time");
    if (!state.lead.location) missing.push("city/address");
    if (!state.lead.guests) missing.push("guest count");
    if (!state.lead.service) missing.push("truck or trays");
    return missing;
  }

  function leadDetailsResponse(input) {
    updateLead(input);
    const missing = missingLeadFields();
    if (missing.length) {
      return {
        text: "Got it. For the catering message, I still need: " + missing.join(", ") + ". Once you have those, text the team and they can quote the right setup.",
        actions: ["text", "catering", "cateringMenu"]
      };
    }

    return {
      text: "Perfect. Send this to Island Boy: Catering request - " + state.lead.date + ", " + state.lead.time + ", " + state.lead.location + ", " + state.lead.guests + ", " + state.lead.service + ". Add your menu direction, then the team can confirm fit and pricing.",
      actions: ["text", "catering", "call"]
    };
  }

  function findResponse(input) {
    const intent = detectIntent(input);
    if (intent === "leadDetails") return leadDetailsResponse(input);

    const response = responseMap[intent] || fallback;
    state.lastIntent = intent === "fallback" ? state.lastIntent : intent;
    if (intent === "catering") updateLead(input);
    return response;
  }

  function resolveAction(action) {
    if (typeof action === "string") return actions[action];
    return action;
  }

  function makeAction(action) {
    const item = resolveAction(action);
    if (!item) return null;
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
      responseActions.map(makeAction).filter(Boolean).forEach((node) => actionRow.appendChild(node));
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
    window.setTimeout(() => addMessage(body, "bot", response.text, response.actions), 160);
    input.value = "";
  }

  function init() {
    const root = document.createElement("div");
    root.className = "ib-chat";
    root.innerHTML = '<button class="ib-chat-launcher" type="button" aria-expanded="false" aria-label="Open Island Boy assistant"><span class="ib-chat-launcher-icon">IB</span><span>Ask Island Boy<small>Location, menu, catering</small></span></button><section class="ib-chat-panel" aria-label="Island Boy Kreationz assistant"><div class="ib-chat-head"><span class="ib-chat-logo"><img src="assets/island-boy-logo.png" alt=""></span><div class="ib-chat-title"><strong>Island Boy Assistant</strong><span>Ask like a normal text</span></div><button class="ib-chat-close" type="button" aria-label="Close assistant">x</button></div><div class="ib-chat-quick" aria-label="Quick questions"><button class="ib-chip primary" type="button" data-question="Where are you guys at today?">Today</button><button class="ib-chip" type="button" data-question="What is on the menu?">Menu</button><button class="ib-chip" type="button" data-question="I want to book catering">Catering</button><button class="ib-chip" type="button" data-question="How do I order?">Order</button></div><div class="ib-chat-body"></div><form class="ib-chat-form"><input class="ib-chat-input" type="text" autocomplete="off" placeholder="Ask: where are you today? menu? catering?"><button class="ib-chat-submit" type="submit">Send</button></form></section>';
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
        addMessage(body, "bot", "Hey, I am the Island Boy site assistant. Ask me naturally: where are you today, what is on the menu, how do I order, or can I book catering?", ["menu", "location", "text", "catering"]);
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

    if (window.location.hash === "#chat") setOpen(true);
    window.__islandBoyChatbotTest = { findResponse, detectIntent, state };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
