/**
 * apply-shell.mjs — installs the shared header, footer, and CSS links
 * into the hand-built pages (home, order, contact, about, gallery, blog, faq).
 * Generated pages get the shell from build-pages.mjs instead.
 *
 * Run: node scripts/apply-shell.mjs
 */
import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { headerHTML, footerHTML, CSS_LINKS } from './shell-snippets.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const PAGES = [
  'index.html', 'order.html', 'july-26-free-event-signup.html', 'contact.html', 'about.html', 'gallery.html',
  'blog.html', 'blog-oxtail-catering-nc.html', 'blog-caribbean-catering-charlotte.html',
  'faq.html',
];

const HEADER_RE = /<header class="topbar">[\s\S]*?<\/header>/g;
const FOOTER_RE = /<footer[\s\S]*?<\/footer>/g;

for (const page of PAGES) {
  const path = join(ROOT, page);
  let html;
  try { html = await readFile(path, 'utf8'); } catch { console.log(`!! ${page}: missing, skipped`); continue; }

  const headers = html.match(HEADER_RE) || [];
  const footers = html.match(FOOTER_RE) || [];
  const notes = [];

  if (headers.length === 1) { html = html.replace(HEADER_RE, headerHTML()); notes.push('header ✓'); }
  else notes.push(`header SKIPPED (${headers.length} matches)`);

  if (footers.length === 1) { html = html.replace(FOOTER_RE, footerHTML()); notes.push('footer ✓'); }
  else notes.push(`footer SKIPPED (${footers.length} matches)`);

  const missing = CSS_LINKS.filter((href) => !html.includes(href));
  if (missing.length) {
    const tags = missing.map((href) => `<link rel="stylesheet" href="${href}">`).join('');
    html = html.replace('</head>', `${tags}</head>`);
    notes.push(`css +${missing.length} (${missing.map((m) => m.split('/')[1]).join(', ')})`);
  } else notes.push('css ✓');

  await writeFile(path, html);
  console.log(`${page}: ${notes.join(' · ')}`);
}
