/**
 * shell-snippets.mjs — single source of truth for the Island Boy site shell.
 * Exports the shared header/footer markup, CSS link block, and the
 * city + service datasets used by build-pages.mjs and apply-shell.mjs.
 */

export const SITE = {
  origin: 'https://islandboykreationz.com',
  name: 'Island Boy Kreationz Food Truck & Catering',
  phone: '980-785-8372',
  phoneHref: 'tel:+19807858372',
  email: 'deonhenry756@gmail.com',
  instagram: 'https://www.instagram.com/islandboy_kreationz/',
  address: '6100 Hunter Ave, Charlotte, NC 28262',
  year: 2026,
  eventHref: 'july-26-free-event-signup.html',
};

/* ---------------------------------------------------------------- cities */

const NOTE_BY_REGION = {
  metro: (n) => `${n} is home turf — the truck is based in Charlotte, so metro dates are the easiest to fit. Send your date early and the team can confirm fast.`,
  triad: (n) => `${n} catering is available with advance booking. Send the exact venue, date, guest count, and service format so travel and prep can be confirmed.`,
  triangle: (n) => `The Triangle is a longer run from Charlotte, so ${n} bookings fit best for bigger events planned in advance — drop-off trays or full truck service.`,
  extended: (n) => `${n} is extended-travel territory. Requests are reviewed case by case and work best for larger events booked well ahead.`,
};

export const REGIONS = [
  { key: 'metro', label: 'Charlotte Metro', badge: 'Based in Charlotte' },
  { key: 'triad', label: 'Triad & I-85 North', badge: 'Regular I-85 route' },
  { key: 'triangle', label: 'The Triangle', badge: 'Advance bookings' },
  { key: 'extended', label: 'Extended Travel', badge: 'Big-event travel' },
];

const HERO_IMGS = [
  'island-boy-oxtail-trays.jpg',
  'island-boy-wing-plate-mac-cabbage.jpg',
  'island-boy-chopped-chicken-bowl.jpg',
  'island-boy-curry-chicken-meal.jpg',
  'island-boy-salmon-bowl.jpg',
];

const C = (name, slug, region, vibe, events, nearby) => ({ name, slug, region, vibe, events, nearby });

export const CITIES = [
  // Charlotte Metro
  C('Charlotte', 'charlotte', 'metro',
    'from Uptown offices to University City block parties',
    'office lunches, corporate meals, private parties, church functions, school and university events, neighborhood pop-ups, birthdays, and graduations',
    ['matthews', 'pineville', 'huntersville', 'concord', 'mint-hill', 'gastonia']),
  C('Concord', 'concord', 'metro',
    'race weekends, mills-turned-venues, and family backyards alike',
    'private parties, office lunches, church events, community days, race-weekend gatherings, birthdays, and graduations',
    ['kannapolis', 'harrisburg', 'charlotte', 'salisbury', 'huntersville']),
  C('Huntersville', 'huntersville', 'metro',
    'Lake Norman gatherings and north-Charlotte business parks',
    'office lunches, lake-house parties, church events, community days, birthdays, and corporate meals',
    ['charlotte', 'mooresville', 'concord', 'statesville']),
  C('Kannapolis', 'kannapolis', 'metro',
    'downtown events and family cookouts across Cabarrus County',
    'private parties, church functions, community days, office lunches, birthdays, and graduations',
    ['concord', 'salisbury', 'harrisburg', 'charlotte']),
  C('Mooresville', 'mooresville', 'metro',
    'Race City crews, lake days, and company lunches',
    'office lunches, lake gatherings, shop and team meals, private parties, church events, and birthdays',
    ['statesville', 'huntersville', 'salisbury', 'charlotte']),
  C('Gastonia', 'gastonia', 'metro',
    'west of the river but right on the route',
    'church functions, community days, private parties, office lunches, birthdays, and graduations',
    ['charlotte', 'pineville', 'huntersville']),
  C('Matthews', 'matthews', 'metro',
    'downtown Matthews festivals to quiet cul-de-sac cookouts',
    'private parties, neighborhood gatherings, church events, office lunches, birthdays, and graduations',
    ['mint-hill', 'indian-trail', 'monroe', 'charlotte', 'pineville']),
  C('Mint Hill', 'mint-hill', 'metro',
    'family land, big yards, and church grounds with room for a truck',
    'church functions, family reunions, private parties, community days, birthdays, and graduations',
    ['matthews', 'harrisburg', 'charlotte', 'indian-trail']),
  C('Indian Trail', 'indian-trail', 'metro',
    'one of the fastest-growing towns in Union County',
    'neighborhood gatherings, private parties, church events, office lunches, birthdays, and graduations',
    ['matthews', 'monroe', 'mint-hill', 'charlotte']),
  C('Monroe', 'monroe', 'metro',
    'Union County seat with deep cookout culture',
    'church functions, family reunions, community days, private parties, birthdays, and graduations',
    ['indian-trail', 'matthews', 'charlotte']),
  C('Pineville', 'pineville', 'metro',
    'right off I-485 on the south side',
    'office lunches, private parties, church events, community days, and birthdays',
    ['charlotte', 'matthews', 'gastonia']),
  C('Harrisburg', 'harrisburg', 'metro',
    'between Charlotte and Concord with easy truck access',
    'neighborhood gatherings, church events, private parties, office lunches, and graduations',
    ['concord', 'charlotte', 'mint-hill', 'kannapolis']),
  // Triad & I-85 North
  C('Salisbury', 'salisbury', 'triad',
    'historic downtown blocks and Rowan County gatherings',
    'church functions, community days, private parties, office lunches, and family reunions',
    ['kannapolis', 'concord', 'statesville', 'mooresville']),
  C('Statesville', 'statesville', 'triad',
    'crossroads of I-77 and I-40',
    'shop and team meals, church events, community days, private parties, and birthdays',
    ['mooresville', 'salisbury', 'huntersville', 'hickory']),
  C('Hickory', 'hickory', 'triad',
    'furniture-country crews and foothills festivals',
    'company lunches, community festivals, church events, private parties, and graduations',
    ['statesville', 'mooresville', 'asheville']),
  C('Greensboro', 'greensboro', 'triad',
    'college campuses, corporate parks, and Gate City community events',
    'office lunches, university events, church functions, community days, private parties, and graduations',
    ['high-point', 'winston-salem', 'salisbury']),
  C('Winston-Salem', 'winston-salem', 'triad',
    'from Innovation Quarter offices to east-side family reunions',
    'office lunches, corporate meals, church events, community days, private parties, and graduations',
    ['greensboro', 'high-point', 'statesville']),
  C('High Point', 'high-point', 'triad',
    'Furniture Market crowds and year-round local events',
    'market-week meals, office lunches, church events, private parties, and community days',
    ['greensboro', 'winston-salem', 'salisbury']),
  // Triangle
  C('Raleigh', 'raleigh', 'triangle',
    'state-capital offices, campuses, and neighborhood festivals',
    'office lunches, corporate events, university gatherings, church functions, private parties, and graduations',
    ['durham', 'cary', 'fayetteville']),
  C('Durham', 'durham', 'triangle',
    'Bull City offices, Duke-area events, and community days',
    'office lunches, corporate meals, university events, church functions, private parties, and graduations',
    ['raleigh', 'cary', 'greensboro']),
  C('Cary', 'cary', 'triangle',
    'tech-park lunches and family celebrations across western Wake',
    'office lunches, corporate events, private parties, church functions, birthdays, and graduations',
    ['raleigh', 'durham', 'fayetteville']),
  // Extended travel
  C('Asheville', 'asheville', 'extended',
    'mountain weddings-adjacent gatherings, festivals, and big group meals',
    'large private parties, community festivals, company retreats, church events, and family reunions',
    ['hickory', 'statesville', 'charlotte']),
  C('Fayetteville', 'fayetteville', 'extended',
    'military-family celebrations and big community cookouts',
    'large private parties, military and unit functions, church events, community days, and family reunions',
    ['raleigh', 'cary', 'monroe']),
  C('Wilmington', 'wilmington', 'extended',
    'coastal celebrations worth the drive',
    'large private parties, beach-week gatherings, church events, community festivals, and family reunions',
    ['fayetteville', 'raleigh']),
];

CITIES.forEach((c, i) => { c.img = HERO_IMGS[i % HERO_IMGS.length]; c.note = NOTE_BY_REGION[c.region](c.name); });

export const cityHref = (slug) => `catering-${slug}-nc.html`;
export const cityBySlug = Object.fromEntries(CITIES.map((c) => [c.slug, c]));

/* -------------------------------------------------------------- services */

export const SERVICES = [
  {
    slug: 'food-truck-catering-nc', nav: 'Food Truck Catering', title: 'Food Truck Catering',
    kicker: 'Food truck catering', img: 'island-boy-wing-plate-mac-cabbage.jpg',
    serviceType: 'Food truck catering',
    h1: 'Book the truck for your next event.',
    lead: 'The Island Boy Kreationz truck pulls up, the window opens, and your guests order hot Caribbean soul food made on the spot — wings, oxtails, bowls, and sides straight off the line.',
    cards: [
      ['Events that fit the truck', 'Office lunches, neighborhood pop-ups, community days, school and church events, birthdays, graduations, and corporate appreciation days.'],
      ['How service runs', 'The truck arrives ahead of your service window, sets up, and serves your guest list or open line. You set the window; the team handles the rest.'],
      ['What to send', 'Date, address, guest count, service window, and menu direction. The team confirms fit, travel, and timing before anything is locked in.'],
    ],
    menuLine: 'Oxtails, wings, chopped chicken, curry chicken, shrimp and salmon bowls, rice and peas, yellow rice, cabbage, candied yams, mac and cheese, cornbread, cakes, and drinks.',
    note: 'The truck is based in Charlotte and accepts advance-booking requests across the 24 North Carolina markets listed on the website. Distance, date, guest count, and site access determine final availability.',
    faq: [
      ['Does the truck need anything on site?', 'Level parking with safe access for guests. Send venue instructions with your inquiry and the team will flag anything else.'],
      ['Can guests order individually?', 'Yes — open-line service or a set menu for your guest count both work. Say which direction you want when you inquire.'],
      ['What if my event is outside Charlotte?', 'Travel across North Carolina is on the table. Distance, date, and guest count decide fit, so send those first.'],
    ],
  },
  {
    slug: 'oxtail-catering-nc', nav: 'Oxtail Catering', title: 'Oxtail Catering',
    kicker: 'Oxtail catering', img: 'island-boy-oxtail-trays.jpg',
    serviceType: 'Oxtail catering',
    h1: 'Oxtails that headline the whole event.',
    lead: 'Slow-braised, fall-off-the-bone oxtails are the Island Boy signature — served as plates, bowls, or catering trays with rice and peas soaking up the gravy.',
    cards: [
      ['Ways to serve it', 'Oxtail meals and bowls off the truck, or half and full trays dropped off with rice and peas, cabbage, mac and cheese, and cornbread.'],
      ['Why guests remember it', 'Oxtails are the dish people line up twice for. If you want one item that makes the event feel like a real Caribbean spread, this is it.'],
      ['What to send', 'Date, address, guest count, and whether you want truck service, trays, or both. Oxtails sell out — earlier is better.'],
    ],
    menuLine: 'Pair oxtails with rice and peas, yellow rice, cabbage, candied yams, mac and cheese, and cornbread — plus wings or chopped chicken for mixed crowds.',
    note: 'Oxtails take real braise time, so confirmed guest counts a few days ahead keep portions right and the gravy generous.',
    faq: [
      ['How are oxtail trays portioned?', 'Half and full trays. Share your guest count and the team sizes trays and sides so plates come out right.'],
      ['Is the gravy spicy?', 'Rich and savory more than hot. If your crowd wants extra heat, say so in the inquiry.'],
      ['Can I mix oxtails with other mains?', 'Yes — most events pair oxtails with wings or chopped chicken so every kind of eater is covered.'],
    ],
  },
  {
    slug: 'private-party-catering-nc', nav: 'Private Party Catering', title: 'Private Party Catering',
    kicker: 'Private party catering', img: 'island-boy-chopped-chicken-bowl.jpg',
    serviceType: 'Private party catering',
    h1: 'Caribbean catering for your private party.',
    lead: 'Birthdays, graduations, family reunions, backyard parties, and private venue events — the truck pulls up or the trays show up, and the party eats well.',
    cards: [
      ['Party-ready events', 'Birthdays, graduations, family reunions, anniversaries, backyard parties, watch parties, and private venue celebrations.'],
      ['Truck or trays', 'Food truck service brings the show; drop-off trays keep it simple. Plenty of parties book both — truck for the line, trays for the table.'],
      ['What to send', 'Date, address, city, guest count, service window, menu direction, and any venue instructions for where the truck or trays land.'],
    ],
    menuLine: 'Oxtails, wings, chopped chicken, curry chicken, shrimp and salmon bowls, soul food sides, cakes, desserts, and drinks.',
    note: 'Weekend dates move fast — Saturday spots can shift, so lock your date early and the team will confirm the window.',
    faq: [
      ['How far ahead should I book?', 'As soon as your date is firm. Weekends fill first, and oxtails sell out.'],
      ['Do you handle small parties?', 'Send your count either way — trays scale down easily, and the team will say honestly whether truck service fits.'],
      ['Can you serve at a rented venue?', 'Yes. Include the venue name and any rules (parking, power, timing) in your inquiry.'],
    ],
  },
  {
    slug: 'office-lunch-catering-nc', nav: 'Office Lunch Catering', title: 'Office Lunch Catering',
    kicker: 'Office lunch catering', img: 'island-boy-curry-chicken-meal.jpg',
    serviceType: 'Office lunch catering',
    h1: 'Office lunches the whole team talks about.',
    lead: 'Swap the usual sandwich tray for oxtails, wings, and island bowls. Truck service in the parking lot or trays in the break room — either way, lunch stops being boring.',
    cards: [
      ['Built for workplaces', 'Team lunches, client days, employee appreciation, corporate meals, shop and warehouse crews, and recurring lunch programs.'],
      ['Two easy formats', 'Truck on site with a set window so everyone cycles through, or drop-off trays and bowls portioned for your headcount.'],
      ['What to send', 'Company name, address, headcount, lunch window, budget direction, and whether you want truck service or drop-off.'],
    ],
    menuLine: 'Chopped chicken and curry chicken bowls, wings, oxtails, shrimp and salmon bowls, rice and peas, cabbage, mac and cheese, and cornbread.',
    note: 'Tuesday through Friday daytime windows fit the truck schedule best. Recurring office dates can be set up once and repeated.',
    faq: [
      ['Can employees order individually?', 'Yes — open-line truck service works great for offices. Set menus and trays work better for tight lunch windows.'],
      ['Do you do recurring lunches?', 'Yes. Say you want a recurring date in your inquiry and the team will work out a rhythm.'],
      ['What about dietary needs?', 'The kitchen cooks no pork, and seafood and vegetable sides cover most needs — flag specifics in your inquiry.'],
    ],
  },
  {
    slug: 'church-community-event-catering-nc', nav: 'Church & Community Events', title: 'Church & Community Event Catering',
    kicker: 'Church & community catering', img: 'island-boy-oxtail-trays.jpg',
    serviceType: 'Church and community event catering',
    h1: 'Feeding the congregation and the block.',
    lead: 'Church functions, community days, school events, and family reunions — big-batch Caribbean soul food that respects the occasion and the budget. No pork in the kitchen.',
    cards: [
      ['Gatherings we serve', 'Church anniversaries and fellowship meals, community days, school and youth events, fundraisers, and multi-family reunions.'],
      ['Made for big groups', 'Trays scale from fifty plates to hundreds, and the truck handles open community lines. Tell the team the realistic range and they plan for it.'],
      ['What to send', 'Organization name, date, address, expected count, serving window, and whether you want truck service, trays, or both.'],
    ],
    menuLine: 'Oxtails, wings, chopped chicken, curry chicken, rice and peas, yellow rice, cabbage, candied yams, mac and cheese, cornbread, cakes, and drinks.',
    note: 'The kitchen cooks no pork, which keeps menus simple for mixed congregations. Flexible counts are normal for community events — share a range.',
    faq: [
      ['Do you work with event budgets?', 'Send your budget direction with the headcount and the team will say plainly what fits.'],
      ['Can you serve a long open line?', 'Yes — community-day lines are what the truck is built for. Set the window and the team staffs for it.'],
      ['Is everything pork-free?', 'Yes. Island Boy Kreationz does not cook pork at all.'],
    ],
  },
  {
    slug: 'tray-catering-nc', nav: 'Party Trays & Drop-Off', title: 'Party Trays & Drop-Off Catering',
    kicker: 'Party trays & drop-off', img: 'island-boy-salmon-bowl.jpg',
    serviceType: 'Catering tray drop-off',
    h1: 'Hot trays, dropped where you need them.',
    lead: 'No truck required — half and full trays of oxtails, wings, chopped chicken, and soul food sides, cooked and delivered ready to serve.',
    cards: [
      ['When trays beat the truck', 'Indoor venues, office break rooms, church halls, tight parking, short windows, or any event where you just want the food handled.'],
      ['How trays arrive', 'Cooked, covered, and ready to serve. Tell the team your serving time and they aim the drop-off so food lands hot.'],
      ['What to send', 'Date, drop-off address, guest count, serving time, and menu direction — mains, sides, and desserts.'],
    ],
    menuLine: 'Oxtail trays, wing trays, chopped chicken, curry chicken, rice and peas, yellow rice, cabbage, candied yams, mac and cheese, cornbread, cakes, and desserts.',
    note: 'Trays are the most flexible way to book across the website’s 24 North Carolina markets. Final travel, pickup or delivery, timing, and order size are confirmed before payment.',
    faq: [
      ['How many people does a tray feed?', 'Depends on the dish and whether it is a half or full tray — send your headcount and the team sizes the order.'],
      ['Do trays come with serving gear?', 'Ask in your inquiry — setups vary by event, and the team will tell you exactly what arrives.'],
      ['Can I pick up instead?', 'Pickup can work depending on the day — ask when you send your date.'],
    ],
  },
];

export const serviceHref = (s) => `${s.slug}.html`;

/* ------------------------------------------------------------ CSS links */

export const CSS_LINKS = [
  'assets/island-chatbot.css',
  'assets/site-polish.css',
  'assets/vi-theme-unity.css',
  'assets/mobile-professional.css',
  'assets/site-shell.css',
];

export const cssLinkBlock = () => CSS_LINKS.map((h) => `<link rel="stylesheet" href="${h}">`).join('');

/* ---------------------------------------------------------------- header */

export function headerHTML() {
  const cateringLinks = SERVICES.map((s) => `<a href="${serviceHref(s)}">${s.nav}</a>`).join('');
  const megaCols = REGIONS.map((r) => {
    const links = CITIES.filter((c) => c.region === r.key)
      .map((c) => `<a href="${cityHref(c.slug)}">${c.name}</a>`).join('');
    return `<div class="dd-col${r.key === 'metro' ? ' dd-col-2up' : ''}"><span class="dd-col-title">${r.label}</span><div class="dd-col-links">${links}</div></div>`;
  }).join('');
  return `<header class="topbar"><div class="wrap nav"><a class="brand" href="index.html"><span class="mark logo-mark"><img src="assets/island-boy-logo.png" alt="Island Boy Kreationz logo"></span><span><strong>Island Boy Kreationz</strong><small>Food Truck &amp; Catering</small></span></a><nav class="links" aria-label="Primary navigation"><a href="index.html#menu">Menu</a><a class="event-nav-link" href="${SITE.eventHref}">Free Event</a><div class="nav-dropdown"><button class="nav-dropdown-toggle" type="button" aria-expanded="false" aria-haspopup="true">Catering <span class="dd-caret" aria-hidden="true">▾</span></button><div class="nav-dropdown-menu dd-list"><a class="dd-lead" href="services.html">All Catering Services</a>${cateringLinks}</div></div><div class="nav-dropdown nav-dropdown-wide"><button class="nav-dropdown-toggle" type="button" aria-expanded="false" aria-haspopup="true">Locations <span class="dd-caret" aria-hidden="true">▾</span></button><div class="nav-dropdown-menu dd-mega">${megaCols}<a class="dd-all" href="service-areas.html">View all North Carolina service areas →</a></div></div><div class="nav-dropdown"><button class="nav-dropdown-toggle" type="button" aria-expanded="false" aria-haspopup="true">About <span class="dd-caret" aria-hidden="true">▾</span></button><div class="nav-dropdown-menu dd-list"><a href="about.html">Our Story</a><a href="gallery.html">Gallery</a><a href="blog.html">Blog</a><a href="faq.html">FAQ</a><a href="contact.html">Contact</a></div></div><a class="pill booking-pill" href="contact.html#lead-form">Book Catering</a><a class="pill" href="order.html">Order Now</a></nav></div></header>`;
}

/* ---------------------------------------------------------------- footer */

export function footerHTML() {
  const svc = SERVICES.map((s) => `<a href="${serviceHref(s)}">${s.nav}</a>`).join('');
  const footCities = ['charlotte', 'concord', 'huntersville', 'matthews', 'mooresville', 'gastonia', 'raleigh', 'durham', 'greensboro', 'winston-salem']
    .map((slug) => `<a href="${cityHref(slug)}">${cityBySlug[slug].name}</a>`).join('');
  return `<footer class="site-footer"><div class="wrap"><div class="foot-grid"><div class="foot-brand"><a class="brand" href="index.html"><span class="mark logo-mark"><img src="assets/island-boy-logo.png" alt="Island Boy Kreationz logo"></span><span><strong>Island Boy Kreationz</strong><small>Food Truck &amp; Catering</small></span></a><p class="foot-tag">Virgin Islands born, Charlotte based. Caribbean soul food from the truck or delivered in trays — oxtails, wings, bowls, and full event spreads. No pork kitchen.</p><p class="foot-contact">${SITE.address}<br><a href="${SITE.phoneHref}">${SITE.phone}</a> · <a href="mailto:${SITE.email}">${SITE.email}</a><br><a href="${SITE.instagram}" target="_blank" rel="noopener">@islandboy_kreationz</a></p><p class="foot-hours">Truck: Tue–Fri 2:30–8:30 PM · Amazon stop: Tue–Sat 9–11 PM<br>Saturday spots move — call, text, or check Instagram first.</p></div><nav class="foot-col" aria-label="Catering services"><span class="foot-title">Catering</span><a href="services.html">All Services</a>${svc}<a class="foot-cta" href="contact.html#lead-form">Book Catering →</a></nav><nav class="foot-col" aria-label="Service areas"><span class="foot-title">Service Areas</span>${footCities}<a class="foot-cta" href="service-areas.html">All 24 service areas →</a></nav><nav class="foot-col" aria-label="Explore"><span class="foot-title">Explore</span><a href="index.html#menu">Menu</a><a href="${SITE.eventHref}">July 26 Free Event</a><a href="order.html">Order Online</a><a href="about.html">Our Story</a><a href="gallery.html">Gallery</a><a href="blog.html">Blog</a><a href="faq.html">FAQ</a><a href="contact.html">Contact</a><a href="privacy.html">Privacy</a></nav></div><div class="foot-bottom"><span>© ${SITE.year} ${SITE.name} · Charlotte, NC</span><span>Site by S4 AI Agency</span></div></div></footer>`;
}
