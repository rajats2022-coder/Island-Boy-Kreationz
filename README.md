# Island Boy Kreationz Website

Static website for Island Boy Kreationz Food Truck & Catering.

## Files

- `index.html` - homepage
- `order.html` - static order builder and checkout-style inquiry flow
- `services.html` - catering services hub (generated)
- `contact.html` - catering and food truck booking inquiry page
- `about.html` - owner story page
- `gallery.html` - food and brand gallery
- `service-areas.html` - North Carolina service-area hub, 4 regions (generated)
- `blog.html`, `blog-*.html` - catering SEO guides
- `faq.html` - FAQ page with FAQ schema
- `catering-*-nc.html` - 24 city catering pages (generated)
- `food-truck-catering-nc.html`, `oxtail-catering-nc.html`, `private-party-catering-nc.html`, `office-lunch-catering-nc.html`, `church-community-event-catering-nc.html`, `tray-catering-nc.html` - 6 service pages (generated)
- `assets/` - images, shared CSS (`site-shell.css` owns nav/footer/page kit), nav behavior (`mobile-polish.js`), chatbot
- `robots.txt`, `sitemap.xml`, `llms.txt`, `llms-full.txt` - SEO and AI discovery files

## Generated pages — edit the generator, not the files

City pages, service pages, and the two hubs are built from data in `scripts/shell-snippets.mjs`:

```bash
node scripts/build-pages.mjs    # regenerates 32 pages + sitemap.xml + llms.txt
node scripts/apply-shell.mjs    # re-installs shared header/footer into the 10 hand-built pages
```

To add a city or service: add it to `CITIES` or `SERVICES` in `scripts/shell-snippets.mjs`, run both scripts. The nav dropdowns, footer link columns, and sitemap update automatically.

## Dev loop

```bash
node serve.mjs                                          # http://localhost:3016
node scripts/shot.mjs <url> <label> [js] [--mobile] [--full]   # puppeteer screenshots → temporary screenshots/
```

## Publishing Notes

Keep live location and same-day availability language flexible. Saturday locations can change, so pages should keep directing customers to call, text, or check Instagram before driving.

The order flow is static. Connect payment processing or a backend before treating the site as a fully automated checkout.
