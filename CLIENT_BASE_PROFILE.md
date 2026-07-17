# Island Boy Kreationz Client Base Profile

## Source of truth

- Repo: `/Users/rajatsingh/Downloads/S4 AI Agency/S4 AI LLC/Client Database/Island Boy Kreationz Food Truck & Catering`
- Live site: `https://islandboykreationz.com`
- Primary market: Charlotte, North Carolina
- Verified GBP service areas: Charlotte, Concord, Gastonia, and Huntersville
- Git remote: `https://github.com/rajats2022-coder/Island-Boy-Kreationz.git`
- Branch: `main`
- GBP manager: `s4aiagency@gmail.com`
- GBP account: `accounts/112847676151231508867`
- GBP location: `locations/4659897749506289698`
- Formspree event form: `mdarqaey`
- Sender mailbox: `deonhenry756@gmail.com`

## Scheduled jobs

### Google review sync and replies

- Label: `com.s4ai.island-boy-google-reviews`
- Schedule: daily at 7:25 AM local time
- Command: `node scripts/island-boy-gbp.mjs --sync-reviews --reply-unanswered`
- Behavior: fetches official GBP reviews, records rating/count/reply state, and publishes up to five replies to unanswered reviews. Use `--dry-run-replies` for safe review.
- Logs: `logs/gbp-reviews.log`, `logs/gbp-reviews-launchd.log`, `logs/gbp-reviews-launchd.err`
- Telegram: sends a concise success/failure result with review count and replies posted.

### Google Business Profile posts

- Label: `com.s4ai.island-boy-google-posts`
- Schedule: daily check at 8:40 AM local time
- Command: `node scripts/island-boy-gbp.mjs --maybe-post`
- Behavior: publishes at most once per local calendar day. Tuesday is the weekly schedule; Wednesday-Friday are today's recurring stops; Saturday directs customers to Instagram/text for the moving daytime location; Sunday highlights the menu/order path; Monday rotates catering and party-tray lead generation. Date-specific changes belong in `data/island-boy-schedule.json`. Use `--dry-run-post` for safe review.
- Logs: `logs/gbp-posts.log`, `logs/gbp-posts-launchd.log`, `logs/gbp-posts-launchd.err`
- Telegram: reports whether the daily post was published, skipped, or failed.

### Google Business Profile performance analytics

- Label: `com.s4ai.island-boy-google-analytics`
- Schedule: Tuesday at 8:05 AM local time
- Command: `node scripts/island-boy-gbp.mjs --sync-analytics`
- Behavior: records 56 days of supported GBP metrics, compares the latest 28 days with the prior 28 days, saves calls, website clicks, directions, menu clicks, food orders, profile impressions, action rate, and sales-focused recommendations to `data/google-performance.json`, appends the weekly comparison baseline to `data/google-performance-history.json`, then sends the concise digest through the configured Telegram channel. Review syncs also preserve daily rating, review-count, rating-mix, and response-rate snapshots in `data/google-review-history.json`.
- Logs: `logs/gbp-analytics.log`, `logs/gbp-analytics-launchd.log`, `logs/gbp-analytics-launchd.err`
- Telegram: sends the 28-day metrics and the highest-priority sales recommendation.

### Google structured menu sync

- Label: `com.s4ai.island-boy-google-menu`
- Schedule: daily at 7:50 AM local time
- Command: `node scripts/island-boy-gbp.mjs --sync-food-menu`
- Behavior: compares the verified 18-item website menu with GBP, preserves existing menu media keys, and updates only when the structured menu changes.

### Search Console reporting

- Label: `com.s4ai.island-boy-search-console`
- Schedule: Tuesday at 8:25 AM local time
- Command: `node scripts/island-boy-gbp.mjs --sync-search-console`
- Behavior: saves current and historical 28-day clicks, impressions, CTR, position, top queries, top pages, and sitemap issues.

### Profile, media, and site health

- Label: `com.s4ai.island-boy-profile-health`
- Schedule: Sunday at 8:30 AM local time
- Command: `node scripts/run-profile-health.mjs`
- Behavior: checks GBP fields, services, media count, menu count, pending edits, page metadata, structured data, broken links, sitemap truth, and production HTTP status. Both checks run even if one fails.

### July 26 registration email follow-up

- Label: `com.s4ai.island-boy-july26-email`
- Schedule: daily at 9:00 AM local time
- Command: `node scripts/july-26-attendee-email.mjs`
- Behavior: reads matching Formspree notification emails in Deon's Gmail, deduplicates recipients, skips tests and already-processed messages, and sends the branded RSVP/review/website email only to newly registered people.
- Initial safety step: `node scripts/july-26-attendee-email.mjs --bootstrap` marks the current list as already handled without sending.
- Logs: `logs/july26-email.log`, `logs/july26-email-launchd.log`, `logs/july26-email-launchd.err`
- Telegram: reports new registrations, confirmation emails sent, backlog, failures, and the July 13 bulk-campaign Sent-mail check.

## Credentials

- Local config: `.env.local` (ignored by Git)
- GBP OAuth client and manager refresh token are read from the shared Google credential path named by `ISLAND_BOY_SHARED_GOOGLE_ENV_PATH`.
- Deon's Gmail refresh token is stored only as `ISLAND_BOY_GMAIL_REFRESH_TOKEN` in this repo's ignored `.env.local`.
- Hermes Telegram variables may be read from `~/.hermes/.env`; never copy or print their values.

## Safe verification

```bash
node scripts/island-boy-gbp.mjs --discover-locations
node scripts/island-boy-gbp.mjs --sync-reviews --reply-unanswered --dry-run-replies --no-telegram
node scripts/island-boy-gbp.mjs --maybe-post --dry-run-post --no-telegram
node scripts/island-boy-gbp.mjs --sync-analytics --no-telegram
node scripts/island-boy-gbp.mjs --audit-profile --no-telegram
node scripts/island-boy-gbp.mjs --apply-services --dry-run-services --no-telegram
node scripts/island-boy-gbp.mjs --sync-food-menu --dry-run-food-menu --no-telegram
node scripts/island-boy-gbp.mjs --sync-search-console --no-telegram
node scripts/site-health.mjs --production
node scripts/submit-indexnow.mjs
node scripts/setup-island-boy-gmail-oauth.mjs --check
node scripts/july-26-attendee-email.mjs --dry-run
```

These automations do not auto-commit or auto-push website files. GBP replies/posts and Gmail sends are external actions; use dry-run modes before changing live settings.
