# Island Boy Kreationz Website

Static website for Island Boy Kreationz Food Truck & Catering.

## Files

- `index.html` - homepage
- `order.html` - static order builder and checkout-style inquiry flow
- `july-26-free-event-signup.html` - July 26 free food event and 7-year anniversary RSVP page
- `services.html` - catering services hub (generated)
- `contact.html` - catering and food truck booking inquiry page
- `about.html` - owner story page
- `gallery.html` - food and brand gallery
- `service-areas.html` - verified Charlotte-area service-area hub (generated)
- `blog.html`, `blog-*.html` - catering SEO guides
- `faq.html` - FAQ page with FAQ schema
- `catering-*-nc.html` - 4 verified city catering pages for Charlotte, Concord, Gastonia, and Huntersville (generated)
- `food-truck-catering-nc.html`, `oxtail-catering-nc.html`, `private-party-catering-nc.html`, `office-lunch-catering-nc.html`, `church-community-event-catering-nc.html`, `tray-catering-nc.html` - 6 service pages (generated)
- `assets/` - images, shared CSS (`site-shell.css` owns nav/footer/page kit), nav behavior (`mobile-polish.js`), chatbot
- `robots.txt`, `sitemap.xml`, `llms.txt`, `llms-full.txt` - SEO and AI discovery files

## Generated pages — edit the generator, not the files

City pages, service pages, and the two hubs are built from data in `scripts/shell-snippets.mjs`:

```bash
node scripts/build-pages.mjs          # regenerates 12 pages + sitemap.xml + llms.txt
node scripts/apply-shell.mjs          # re-installs shared header/footer into hand-built pages
node scripts/normalize-local-seo.mjs  # enforces verified service-area language
node scripts/apply-site-basics.mjs    # installs icons, analytics, and image hints
node scripts/site-health.mjs          # validates page SEO, links, and sitemap
```

Only add a city after the real service area is verified. Add verified cities or services to `CITIES` or `SERVICES` in `scripts/shell-snippets.mjs`, then run the commands above. The nav, footer, and sitemap update automatically.

## Dev loop

```bash
node serve.mjs                                          # http://localhost:3016
node scripts/shot.mjs <url> <label> [js] [--mobile] [--full]   # puppeteer screenshots → temporary screenshots/
```

## Publishing Notes

Keep live location and same-day availability language flexible. Saturday locations can change, so pages should keep directing customers to call, text, or check Instagram before driving.

The order flow is static. Connect payment processing or a backend before treating the site as a fully automated checkout.

## Client automation

Island Boy's local operating automation is documented in `CLIENT_BASE_PROFILE.md`.

- `scripts/island-boy-gbp.mjs` audits the live profile, syncs detailed services and the 18-item menu, mirrors new Instagram schedule posts without duplicates, syncs/replies to reviews, and records GBP and Search Console history.
- `site-analytics.js` loads the dedicated Island Boy GA4 stream only after analytics consent and records menu, order, catering, phone, and successful lead events.
- `scripts/site-health.mjs` checks page metadata, canonicals, structured data, internal links, sitemap truth, and production HTTP status.
- `scripts/submit-indexnow.mjs` submits every canonical sitemap URL after deployment.
- `scripts/setup-island-boy-gmail-oauth.mjs` connects Deon's Gmail for the July 26 attendee workflow.
- `scripts/july-26-attendee-email.mjs` deduplicates Formspree notifications and sends the branded RSVP/review/website email only to newly registered attendees.
- `data/island-boy-schedule.json` is the editable recurring schedule and date-override source used by the daily GBP post.
- `automation/` contains seven unique macOS LaunchAgent templates for reviews, posts/Instagram, GBP analytics, menu sync, Search Console, profile/site health, and the July 26 attendee email workflow.

Secrets remain in ignored `.env.local` files. Run the documented dry-run commands before installing or changing any live scheduler job.
