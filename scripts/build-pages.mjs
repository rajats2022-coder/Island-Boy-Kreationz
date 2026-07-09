/**
 * build-pages.mjs — generates the Island Boy city + service SEO pages,
 * the services/service-areas hubs, sitemap.xml, and llms.txt.
 *
 * Run from anywhere:  node scripts/build-pages.mjs
 * Idempotent — pages are fully regenerated from scripts/shell-snippets.mjs data.
 */
import { writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  SITE, CITIES, REGIONS, SERVICES,
  cityHref, cityBySlug, serviceHref,
  headerHTML, footerHTML, cssLinkBlock,
} from './shell-snippets.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATE = '2026-07-09';

const TILES = [
  ['island-boy-oxtail-trays.jpg', 'Oxtails & rice and peas'],
  ['island-boy-wing-plate-mac-cabbage.jpg', 'Wing meals'],
  ['island-boy-chopped-chicken-bowl.jpg', 'Chopped chicken bowls'],
  ['island-boy-curry-chicken-meal.jpg', 'Curry chicken meals'],
  ['island-boy-salmon-bowl.jpg', 'Salmon plates'],
];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const esc = (s) => s.replace(/&(?![a-z#]+;)/g, '&amp;');

function bandHTML(heroImg, offset = 0) {
  const pool = TILES.filter(([img]) => img !== heroImg);
  const picks = [0, 1, 2].map((i) => pool[(i + offset) % pool.length]);
  return `<div class="ibx-band">${picks.map(([img, label]) =>
    `<figure class="ibx-tile" style="margin:0"><img src="assets/${img}" alt="${label} from Island Boy Kreationz" loading="lazy"><span>${label}</span></figure>`).join('')}</div>`;
}

const STEPS = `<div class="ibx-steps"><div class="ibx-step"><h3>Send the details</h3><p>Date, address, guest count, service window, and menu direction — through the form, or by call or text at <a href="${SITE.phoneHref}" style="font-weight:900;color:#8a4a12;text-decoration:underline;text-underline-offset:3px">${SITE.phone}</a>.</p></div><div class="ibx-step"><h3>The team reviews fit</h3><p>Event fit, travel, timing, and menu get checked before anything is quoted — no surprises on either side.</p></div><div class="ibx-step"><h3>Lock the date</h3><p>Once the window is confirmed, the truck rolls or the trays land — hot, on time, and portioned for your crowd.</p></div></div>`;

function pageShell({ file, title, description, ogImg, schemaGraph, bodyClass, main }) {
  const url = `${SITE.origin}/${file}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="theme-color" content="#110700"><title>${title}</title><meta name="description" content="${description}"><link rel="canonical" href="${url}"><meta name="robots" content="index, follow, max-image-preview:large"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:type" content="website"><meta property="og:url" content="${url}"><meta property="og:image" content="${SITE.origin}/assets/${ogImg}"><meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': schemaGraph })}</script>${cssLinkBlock()}</head><body class="ibx-body ${bodyClass}">${headerHTML()}<main>${main}</main>${footerHTML()}<script src="assets/mobile-polish.js"></script><script src="assets/island-chatbot.js"></script></body></html>`;
}

const BUSINESS_NODE = {
  '@type': ['FoodTruck', 'LocalBusiness', 'FoodEstablishment'],
  '@id': `${SITE.origin}/#business`,
  name: SITE.name,
  url: `${SITE.origin}/`,
  telephone: '+1-980-785-8372',
  email: SITE.email,
  address: { '@type': 'PostalAddress', streetAddress: '6100 Hunter Ave', addressLocality: 'Charlotte', addressRegion: 'NC', postalCode: '28262', addressCountry: 'US' },
  servesCuisine: ['Caribbean', 'Soul Food', 'Oxtail', 'Wings'],
  sameAs: [SITE.instagram],
};

/* ------------------------------------------------------------ city page */

function cityPage(city, idx) {
  const file = cityHref(city.slug);
  const region = REGIONS.find((r) => r.key === city.region);
  const title = `Caribbean Food Truck Catering ${city.name} NC | Island Boy Kreationz`;
  const description = `Book Island Boy Kreationz for Caribbean catering in ${city.name}, NC — oxtails, wings, chopped chicken, bowls, and soul food sides by food truck or drop-off trays.`;
  const nearby = city.nearby.map((slug) => `<a href="${cityHref(slug)}">${cityBySlug[slug].name}</a>`).join('');

  const main = `
<section class="ibx-hero" style="--hero-img:url('assets/${city.img}')"><div class="wrap">
<nav class="ibx-crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span aria-hidden="true">›</span><a href="service-areas.html">Service Areas</a><span aria-hidden="true">›</span><span aria-current="page">${city.name}</span></nav>
<span class="kicker">${city.name}, North Carolina</span>
<h1>Caribbean catering in ${city.name}, NC.</h1>
<p class="ibx-lead">Island Boy Kreationz brings Virgin Islands–style oxtails, wings, bowls, and soul food sides to ${city.name} — ${city.vibe}. Food truck on site or catering trays dropped where you need them.</p>
<div class="ibx-cta-row"><a class="ibx-btn" href="contact.html#lead-form">Book ${city.name} Catering</a><a class="ibx-btn ibx-btn-ghost" href="${SITE.phoneHref}">Call or text ${SITE.phone}</a></div>
<ul class="ibx-badges"><li>Virgin Islands recipes</li><li>Truck service or drop-off trays</li><li>No pork kitchen</li><li>${region.badge}</li></ul>
</div></section>
<section class="ibx-section"><div class="wrap"><h2>Catering for ${city.name} events.</h2><div class="ibx-grid3">
<article class="ibx-card"><h3>Best for ${city.name}</h3><p>${cap(city.events)}.</p></article>
<article class="ibx-card"><h3>Popular menu direction</h3><p>Oxtails, wings, chopped chicken, curry chicken, shrimp and salmon bowls, rice and peas, yellow rice, cabbage, candied yams, mac and cheese, cornbread, cakes, and drinks.</p></article>
<article class="ibx-card"><h3>How to book</h3><p>Send the ${city.name} event date, address, guest count, service window, budget direction, and whether you want truck service, trays, or both.</p></article>
</div></div></section>
<section class="ibx-section"><div class="wrap"><h2>Crowd favorites.</h2><p class="ibx-sub">The plates ${city.name} guests line up for — cooked the same way they come off the truck in Charlotte.</p>${bandHTML(city.img, idx)}<p class="ibx-menu-links"><a href="index.html#menu">See the full menu</a> · <a href="order.html">Order online</a></p></div></section>
<section class="ibx-section"><div class="wrap"><h2>How booking works.</h2>${STEPS}<div class="ibx-note"><p><strong>Travel note:</strong> ${city.note}</p></div></div></section>
<section class="ibx-section"><div class="wrap"><h2>Nearby service areas.</h2><div class="ibx-cloud">${nearby}<a class="ibx-cloud-all" href="service-areas.html">All 24 service areas</a></div></div></section>
<section class="ibx-section ibx-cta-wrap"><div class="wrap"><div class="ibx-cta"><div><h2>Request ${city.name} catering.</h2><p>Send the date, guest count, and menu direction — the team reviews fit, travel, and timing before quoting.</p></div><div class="ibx-cta-actions"><a class="ibx-btn" href="contact.html#lead-form">Start Inquiry</a><a class="ibx-btn ibx-btn-dark" href="${SITE.phoneHref}">${SITE.phone}</a></div></div></div></section>`;

  const schemaGraph = [
    BUSINESS_NODE,
    { '@type': 'Service', name: `Caribbean food truck catering in ${city.name}, NC`, provider: { '@id': `${SITE.origin}/#business` }, serviceType: 'Food truck and event catering', areaServed: { '@type': 'City', name: city.name, address: { '@type': 'PostalAddress', addressRegion: 'NC' } } },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE.origin}/` },
      { '@type': 'ListItem', position: 2, name: 'Service Areas', item: `${SITE.origin}/service-areas.html` },
      { '@type': 'ListItem', position: 3, name: city.name, item: `${SITE.origin}/${file}` },
    ] },
  ];

  return { file, html: pageShell({ file, title, description, ogImg: city.img, schemaGraph, bodyClass: 'page-city-catering', main }) };
}

/* --------------------------------------------------------- service page */

function servicePage(svc, idx) {
  const file = serviceHref(svc);
  const title = `${svc.title} NC | Island Boy Kreationz`;
  const description = `${svc.lead.slice(0, 150).replace(/\s+\S*$/, '')}…`;
  const others = SERVICES.filter((s) => s.slug !== svc.slug)
    .map((s) => `<a href="${serviceHref(s)}">${s.nav}</a>`).join('');
  const popularCities = ['charlotte', 'concord', 'matthews', 'huntersville', 'gastonia', 'raleigh', 'durham', 'greensboro']
    .map((slug) => `<a href="${cityHref(slug)}">${cityBySlug[slug].name}</a>`).join('');

  const main = `
<section class="ibx-hero" style="--hero-img:url('assets/${svc.img}')"><div class="wrap">
<nav class="ibx-crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span aria-hidden="true">›</span><a href="services.html">Catering Services</a><span aria-hidden="true">›</span><span aria-current="page">${svc.nav}</span></nav>
<span class="kicker">${svc.kicker}</span>
<h1>${svc.h1}</h1>
<p class="ibx-lead">${svc.lead}</p>
<div class="ibx-cta-row"><a class="ibx-btn" href="contact.html#lead-form">Book Catering</a><a class="ibx-btn ibx-btn-ghost" href="${SITE.phoneHref}">Call or text ${SITE.phone}</a></div>
<ul class="ibx-badges"><li>Virgin Islands recipes</li><li>Serving all of North Carolina</li><li>No pork kitchen</li><li>Truck or drop-off trays</li></ul>
</div></section>
<section class="ibx-section"><div class="wrap"><h2>How it works.</h2><div class="ibx-grid3">${svc.cards.map(([h, p]) => `<article class="ibx-card"><h3>${esc(h)}</h3><p>${esc(p)}</p></article>`).join('')}</div></div></section>
<section class="ibx-section"><div class="wrap"><h2>What lands on the table.</h2><p class="ibx-sub">${esc(svc.menuLine)}</p>${bandHTML(svc.img, idx)}<p class="ibx-menu-links"><a href="index.html#menu">See the full menu</a> · <a href="order.html">Order online</a></p></div></section>
<section class="ibx-section"><div class="wrap"><h2>Booking, step by step.</h2>${STEPS}<div class="ibx-note"><p><strong>Good to know:</strong> ${esc(svc.note)}</p></div></div></section>
<section class="ibx-section"><div class="wrap"><h2>Quick answers.</h2><div class="ibx-faq">${svc.faq.map(([q, a]) => `<article class="ibx-card"><h3>${esc(q)}</h3><p>${esc(a)}</p></article>`).join('')}</div><p class="ibx-menu-links"><a href="faq.html">Read the full catering FAQ</a></p></div></section>
<section class="ibx-section"><div class="wrap"><h2>More ways to book.</h2><div class="ibx-cloud"><a href="services.html"><strong>All services</strong></a>${others}</div><h2 style="margin-top:38px">Where we cater.</h2><div class="ibx-cloud">${popularCities}<a class="ibx-cloud-all" href="service-areas.html">All 24 service areas</a></div></div></section>
<section class="ibx-section ibx-cta-wrap"><div class="wrap"><div class="ibx-cta"><div><h2>Request ${svc.title.toLowerCase()}.</h2><p>Use the form so the team can review event fit, travel, timing, and menu before quoting.</p></div><div class="ibx-cta-actions"><a class="ibx-btn" href="contact.html#lead-form">Start Inquiry</a><a class="ibx-btn ibx-btn-dark" href="${SITE.phoneHref}">${SITE.phone}</a></div></div></div></section>`;

  const schemaGraph = [
    BUSINESS_NODE,
    { '@type': 'Service', name: `${svc.title} in North Carolina`, provider: { '@id': `${SITE.origin}/#business` }, serviceType: svc.serviceType, areaServed: 'North Carolina' },
    { '@type': 'FAQPage', mainEntity: svc.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];

  return { file, html: pageShell({ file, title, description, ogImg: svc.img, schemaGraph, bodyClass: 'page-service', main }) };
}

/* ----------------------------------------------------------- hub pages */

function servicesHub() {
  const file = 'services.html';
  const title = 'Caribbean Catering Services NC | Island Boy Kreationz';
  const description = 'Food truck catering, oxtail catering, private parties, office lunches, church and community events, and drop-off trays — Caribbean soul food across North Carolina.';
  const cards = SERVICES.map((s) => `<article class="ibx-card"><h3><a href="${serviceHref(s)}" style="color:inherit">${s.title}</a></h3><p>${esc(s.lead)}</p><p class="ibx-menu-links" style="margin-top:12px"><a href="${serviceHref(s)}">See ${s.nav} →</a></p></article>`).join('');

  const main = `
<section class="ibx-hero" style="--hero-img:url('assets/island-boy-oxtail-trays.jpg')"><div class="wrap">
<nav class="ibx-crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span aria-hidden="true">›</span><span aria-current="page">Catering Services</span></nav>
<span class="kicker">Catering services</span>
<h1>Six ways to put Island Boy on the menu.</h1>
<p class="ibx-lead">Truck on site, trays dropped off, or both — pick the format that fits your event and the team handles the rest. Every booking starts with one simple inquiry.</p>
<div class="ibx-cta-row"><a class="ibx-btn" href="contact.html#lead-form">Book Catering</a><a class="ibx-btn ibx-btn-ghost" href="${SITE.phoneHref}">Call or text ${SITE.phone}</a></div>
<ul class="ibx-badges"><li>Virgin Islands recipes</li><li>Serving all of North Carolina</li><li>No pork kitchen</li></ul>
</div></section>
<section class="ibx-section"><div class="wrap"><h2>Pick your format.</h2><div class="ibx-grid3">${cards}</div></div></section>
<section class="ibx-section"><div class="wrap"><h2>Crowd favorites.</h2>${bandHTML('island-boy-oxtail-trays.jpg', 1)}<p class="ibx-menu-links"><a href="index.html#menu">See the full menu</a> · <a href="order.html">Order online</a></p></div></section>
<section class="ibx-section"><div class="wrap"><h2>How booking works.</h2>${STEPS}</div></section>
<section class="ibx-section ibx-cta-wrap"><div class="wrap"><div class="ibx-cta"><div><h2>Not sure which fits?</h2><p>Send the event details anyway — the team will tell you straight whether truck service, trays, or both makes sense.</p></div><div class="ibx-cta-actions"><a class="ibx-btn" href="contact.html#lead-form">Start Inquiry</a><a class="ibx-btn ibx-btn-dark" href="${SITE.phoneHref}">${SITE.phone}</a></div></div></div></section>`;

  const schemaGraph = [
    BUSINESS_NODE,
    { '@type': 'OfferCatalog', name: 'Island Boy Kreationz catering services', itemListElement: SERVICES.map((s) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: s.title, url: `${SITE.origin}/${serviceHref(s)}` } })) },
  ];

  return { file, html: pageShell({ file, title, description, ogImg: 'island-boy-oxtail-trays.jpg', schemaGraph, bodyClass: 'page-services-hub', main }) };
}

function serviceAreasHub() {
  const file = 'service-areas.html';
  const title = 'Service Areas NC | Island Boy Kreationz Caribbean Catering';
  const description = 'Island Boy Kreationz caters across North Carolina — Charlotte metro, the Triad, the Triangle, and beyond. Find your city and book Caribbean catering.';
  const regionIntro = {
    metro: 'Home turf. The truck lives here, so metro dates are the easiest to fit — including short-notice asks.',
    triad: 'Regular runs up I-85 and out I-40. Book a few weeks ahead so travel and prep line up.',
    triangle: 'A longer run from Charlotte — best for bigger events planned in advance, trays or full truck service.',
    extended: 'Worth the drive for the right event. Larger gatherings booked well ahead make the trip work.',
  };
  const sections = REGIONS.map((r) => {
    const chips = CITIES.filter((c) => c.region === r.key)
      .map((c) => `<a href="${cityHref(c.slug)}">${c.name}</a>`).join('');
    return `<section class="ibx-section"><div class="wrap"><h2>${r.label}.</h2><p class="ibx-sub">${regionIntro[r.key]}</p><div class="ibx-cloud">${chips}</div></div></section>`;
  }).join('');

  const main = `
<section class="ibx-hero" style="--hero-img:url('assets/island-boy-wing-plate-mac-cabbage.jpg')"><div class="wrap">
<nav class="ibx-crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span aria-hidden="true">›</span><span aria-current="page">Service Areas</span></nav>
<span class="kicker">North Carolina service areas</span>
<h1>From Charlotte to the coast.</h1>
<p class="ibx-lead">Island Boy Kreationz is based in Charlotte and books Caribbean catering across North Carolina. Find your city below — every page covers what books well there and how travel works.</p>
<div class="ibx-cta-row"><a class="ibx-btn" href="contact.html#lead-form">Start Catering Inquiry</a><a class="ibx-btn ibx-btn-ghost" href="${SITE.phoneHref}">Call or text ${SITE.phone}</a></div>
<ul class="ibx-badges"><li>24 cities &amp; counting</li><li>Truck service or drop-off trays</li><li>No pork kitchen</li></ul>
</div></section>
${sections}
<section class="ibx-section"><div class="wrap"><h2>Don’t see your city?</h2><p class="ibx-sub">The list above is where bookings are most common — not a fence. If your event is somewhere else in the Carolinas, send the details and the team will say honestly whether it fits.</p></div></section>
<section class="ibx-section ibx-cta-wrap"><div class="wrap"><div class="ibx-cta"><div><h2>Bring the island to your city.</h2><p>Send the date, address, guest count, and menu direction — the team reviews travel and timing before quoting.</p></div><div class="ibx-cta-actions"><a class="ibx-btn" href="contact.html#lead-form">Start Inquiry</a><a class="ibx-btn ibx-btn-dark" href="${SITE.phoneHref}">${SITE.phone}</a></div></div></div></section>`;

  const schemaGraph = [
    { ...BUSINESS_NODE, areaServed: CITIES.map((c) => ({ '@type': 'City', name: c.name, address: { '@type': 'PostalAddress', addressRegion: 'NC' } })) },
  ];

  return { file, html: pageShell({ file, title, description, ogImg: 'island-boy-wing-plate-mac-cabbage.jpg', schemaGraph, bodyClass: 'page-service-areas', main }) };
}

/* -------------------------------------------------- sitemap + llms.txt */

function sitemap() {
  const statics = ['', 'order.html', SITE.eventHref, 'services.html', 'service-areas.html', 'contact.html', 'about.html', 'gallery.html', 'blog.html', 'blog-oxtail-catering-nc.html', 'blog-caribbean-catering-charlotte.html', 'blog-food-truck-catering-concord-greensboro.html', 'faq.html'];
  const urls = [
    ...statics,
    ...SERVICES.map((s) => serviceHref(s)),
    ...CITIES.map((c) => cityHref(c.slug)),
  ].map((p) => `  <url><loc>${SITE.origin}/${p}</loc><lastmod>${DATE}</lastmod></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function llms() {
  return `# ${SITE.name}

${SITE.name} is a Virgin Islands-rooted Caribbean soul food food truck and catering business based in Charlotte, North Carolina.

Known menu and catering directions:
- Oxtail meals and bowls
- Wing meals and wing bowls
- Chopped chicken bowls and meals
- Curry chicken meals
- Shrimp bowls
- Salmon bowls and plates
- Beef ribs, sides, cakes, desserts, and drinks

Primary pages:
- Home: /
- Order: /order.html
- July 26 free event sign-up: /${SITE.eventHref}
- Catering services hub: /services.html
- Catering inquiry: /contact.html
- About: /about.html
- Gallery: /gallery.html
- Service areas hub: /service-areas.html
- Blog: /blog.html
- FAQ: /faq.html

Catering service pages:
${SERVICES.map((s) => `- /${serviceHref(s)} (${s.title})`).join('\n')}

Local catering pages (24 North Carolina cities):
${CITIES.map((c) => `- /${cityHref(c.slug)} (${c.name})`).join('\n')}

Contact and social:
- Phone: ${SITE.phone}
- Email: ${SITE.email}
- Instagram: ${SITE.instagram}
- Address listed on site: ${SITE.address}

Operational notes:
- Tuesday-Friday hours are listed as 2:30 PM to 8:30 PM.
- The Amazon stop is listed Tuesday-Saturday from 9 PM to 11 PM.
- Saturday location can change, so customers should call, text, or check Instagram before driving.
- Island Boy Kreationz states that it does not cook pork.
`;
}

/* ------------------------------------------------------------------ run */

const pages = [
  ...CITIES.map((c, i) => cityPage(c, i)),
  ...SERVICES.map((s, i) => servicePage(s, i)),
  servicesHub(),
  serviceAreasHub(),
];

for (const { file, html } of pages) {
  await writeFile(join(ROOT, file), html);
}
await writeFile(join(ROOT, 'sitemap.xml'), sitemap());
await writeFile(join(ROOT, 'llms.txt'), llms());

console.log(`built ${pages.length} pages (+ sitemap.xml, llms.txt)`);
console.log(pages.map((p) => p.file).join('\n'));
