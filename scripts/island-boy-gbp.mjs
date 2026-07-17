#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { get as httpsGet } from "node:https";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "");
const localEnvPath = join(root, ".env.local");
const hermesEnvPath = process.env.HOME ? join(process.env.HOME, ".hermes", ".env") : "";
const reviewsPath = join(root, "data", "google-reviews.json");
const reviewHistoryPath = join(root, "data", "google-review-history.json");
const postStatePath = join(root, "data", "google-post-automation.json");
const schedulePath = join(root, "data", "island-boy-schedule.json");
const performancePath = join(root, "data", "google-performance.json");
const performanceHistoryPath = join(root, "data", "google-performance-history.json");
const searchConsolePath = join(root, "data", "google-search-console.json");
const searchConsoleHistoryPath = join(root, "data", "google-search-console-history.json");
const instagramPath = join(root, "data", "instagram-announcements.json");
const profileAuditPath = join(root, "data", "google-profile-audit.json");
const foodMenuPath = join(root, "data", "google-food-menu.json");
const digestPath = join(root, "logs", "automation-daily-summary.json");
const args = new Set(process.argv.slice(2));

loadDotEnv(localEnvPath);
loadDotEnv(process.env.ISLAND_BOY_SHARED_GOOGLE_ENV_PATH || "");
loadDotEnv(hermesEnvPath);

function loadDotEnv(path) {
  if (!path || !existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

async function fetchJson(url, options = {}) {
  const { label = "Request", ...fetchOptions } = options;
  const response = await fetch(url, fetchOptions);
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`${label} failed: ${response.status} ${JSON.stringify(payload)}`);
  }
  return payload;
}

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJsonIfChanged(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const next = `${JSON.stringify(value, null, 2)}\n`;
  const current = existsSync(path) ? readFileSync(path, "utf8") : "";
  if (next === current) return false;
  writeFileSync(path, next);
  return true;
}

function upsertHistory(path, source, keyField, snapshots) {
  const existing = readJson(path, {});
  const byKey = new Map();
  for (const snapshot of existing.snapshots || []) {
    if (snapshot?.[keyField]) byKey.set(snapshot[keyField], snapshot);
  }
  for (const snapshot of snapshots.filter(Boolean)) {
    if (snapshot?.[keyField]) byKey.set(snapshot[keyField], snapshot);
  }
  const ordered = [...byKey.values()].sort((left, right) =>
    String(left[keyField]).localeCompare(String(right[keyField]))
  );
  return writeJsonIfChanged(path, {
    business: businessName(),
    source,
    trackingStartedAt: existing.trackingStartedAt || ordered[0]?.fetchedAt || new Date().toISOString(),
    snapshots: ordered
  });
}

function businessName() {
  return process.env.ISLAND_BOY_BUSINESS_NAME || "Island Boy Kreationz Food Truck & Catering";
}

function localDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.ISLAND_BOY_TIMEZONE || "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function localWeekday(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: process.env.ISLAND_BOY_TIMEZONE || "America/New_York",
    weekday: "long"
  }).format(date).toLowerCase();
}

async function getGoogleAccessToken() {
  if (process.env.GOOGLE_BUSINESS_PROFILE_ACCESS_TOKEN) {
    return process.env.GOOGLE_BUSINESS_PROFILE_ACCESS_TOKEN;
  }
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token"
  });
  const payload = await fetchJson("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    label: "Google OAuth refresh"
  });
  return payload.access_token;
}

function accountName() {
  const raw = process.env.GOOGLE_BUSINESS_PROFILE_ACCOUNT_ID || "";
  return raw ? (raw.startsWith("accounts/") ? raw : `accounts/${raw}`) : "";
}

function locationName() {
  const account = accountName();
  const raw = process.env.GOOGLE_BUSINESS_PROFILE_LOCATION_ID || "";
  if (!raw) return "";
  if (raw.startsWith("accounts/")) return raw;
  if (raw.startsWith("locations/")) return `${account}/${raw}`;
  return `${account}/locations/${raw}`;
}

function rawLocationId() {
  return (process.env.GOOGLE_BUSINESS_PROFILE_LOCATION_ID || "").split("/").filter(Boolean).pop() || "";
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

async function discoverLocations() {
  const token = await getGoogleAccessToken();
  if (!token) throw new Error("Google manager OAuth credentials are not configured.");
  const accountsPayload = await fetchJson("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
    headers: authHeaders(token),
    label: "Google Business Profile accounts.list"
  });
  for (const account of accountsPayload.accounts || []) {
    console.log(`- ${account.name} ${account.accountName || ""}`.trim());
    const url = new URL(`https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations`);
    url.searchParams.set("readMask", "name,title,metadata");
    url.searchParams.set("pageSize", "100");
    const locationPayload = await fetchJson(url, {
      headers: authHeaders(token),
      label: "Google Business Profile locations.list"
    });
    for (const location of locationPayload.locations || []) {
      console.log(`  - ${location.name} ${location.title || "Untitled"}`);
    }
  }
}

const profileReadMask = [
  "name", "title", "phoneNumbers", "categories", "storefrontAddress", "websiteUri", "regularHours",
  "specialHours", "serviceArea", "profile", "moreHours", "openInfo", "metadata", "serviceItems"
].join(",");

async function fetchProfile(token) {
  const url = new URL(`https://mybusinessbusinessinformation.googleapis.com/v1/locations/${rawLocationId()}`);
  url.searchParams.set("readMask", profileReadMask);
  return fetchJson(url, { headers: authHeaders(token), label: "Google Business Profile locations.get" });
}

async function fetchAttributes(token) {
  return fetchJson(`https://mybusinessbusinessinformation.googleapis.com/v1/locations/${rawLocationId()}/attributes`, {
    headers: authHeaders(token), label: "Google Business Profile locations.getAttributes"
  });
}

async function fetchMedia(token) {
  return fetchJson(`https://mybusiness.googleapis.com/v4/${locationName()}/media?pageSize=100`, {
    headers: authHeaders(token), label: "Google Business Profile media.list"
  });
}

async function fetchLocalPosts(token) {
  return fetchJson(`https://mybusiness.googleapis.com/v4/${locationName()}/localPosts?pageSize=100`, {
    headers: authHeaders(token), label: "Google Business Profile localPosts.list"
  });
}

async function fetchFoodMenus(token) {
  return fetchJson(`https://mybusiness.googleapis.com/v4/${locationName()}/foodMenus`, {
    headers: authHeaders(token), label: "Google Business Profile foodMenus.get"
  });
}

async function fetchGoogleUpdated(token) {
  const url = new URL(`https://mybusinessbusinessinformation.googleapis.com/v1/locations/${rawLocationId()}:getGoogleUpdated`);
  url.searchParams.set("readMask", profileReadMask);
  return fetchJson(url, { headers: authHeaders(token), label: "Google Business Profile locations.getGoogleUpdated" });
}

function desiredServices() {
  const structured = [
    ["job_type_id:corporate_catering", "Caribbean food truck or drop-off catering for Charlotte-area office lunches, meetings, employee appreciation, team meals, and corporate events."],
    ["job_type_id:event_catering", "Food truck and catering service for festivals, schools, churches, community days, neighborhood events, and public gatherings across the Charlotte metro and Triad service area."],
    ["job_type_id:graduation_catering", "Graduation catering with oxtails, wings, bowls, sides, truck service, or party trays for family and school celebrations."],
    ["job_type_id:party_catering", "Birthday and private-party catering with Caribbean mains, bowls, sides, cakes, drinks, food truck service, or drop-off trays."],
    ["job_type_id:private_catering", "Flexible Caribbean food truck or drop-off catering for private events across the Charlotte metro and advance-booking North Carolina markets."],
    ["job_type_id:wedding_catering", "Wedding food truck and reception catering with Caribbean meals, bowls, sides, and service planned around the venue, guest count, and timeline."]
  ].map(([serviceTypeId, description]) => ({ structuredServiceItem: { serviceTypeId, description } }));
  const custom = [
    ["Caribbean food truck catering", "Book the Island Boy Kreationz truck for hot Caribbean meals at office lunches, weddings, parties, festivals, schools, churches, and community events."],
    ["Caribbean catering", "Virgin Islands-rooted Caribbean catering with oxtails, wings, chicken, seafood bowls, sides, desserts, and drinks for Charlotte-metro, Triad, and advance-booking North Carolina events."],
    ["Oxtail catering", "Oxtail meals, bowls, and catering trays paired with rice and peas, cabbage, mac and cheese, candied yams, cornbread, and other verified sides."],
    ["Corporate lunch catering", "Food truck or drop-off office catering for meetings, company lunches, warehouse teams, employee appreciation, and client events."],
    ["Private party catering", "Food truck service or party trays for birthdays, anniversaries, graduations, family reunions, backyard parties, and private venue celebrations."],
    ["Wedding food truck catering", "Caribbean wedding catering with truck service, reception meals, and sides sized around the confirmed guest count and venue setup."],
    ["Festival food truck vendor", "Mobile food service for verified festivals, fairs, outdoor events, markets, and community gatherings, subject to date and site approval."],
    ["School, church and community catering", "No-pork Caribbean catering for school events, church fellowship meals, fundraisers, youth programs, and neighborhood celebrations."],
    ["Party trays and drop-off catering", "Hot half- and full-tray catering for offices, church halls, private parties, and venues where drop-off service fits better than the truck."],
    ["Large food orders", "Advance large-order meals and bowls for groups, with final availability, portions, pickup or delivery, and total confirmed directly before the order is accepted."]
  ].map(([displayName, description]) => ({
    freeFormServiceItem: { category: "gcid:mobile_catering", label: { displayName, description, languageCode: "en" } }
  }));
  return [...structured, ...custom];
}

const desiredGbpServiceAreaCities = [
  "Charlotte", "Concord", "Huntersville", "Kannapolis", "Mooresville", "Gastonia",
  "Matthews", "Mint Hill", "Indian Trail", "Monroe", "Pineville", "Harrisburg",
  "Salisbury", "Statesville", "Hickory", "Greensboro", "Winston-Salem", "High Point"
];

function normalizedServiceAreaCities(profile) {
  return (profile.serviceArea?.places?.placeInfos || [])
    .map((item) => String(item.placeName || "").split(",")[0].trim())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
}

function desiredRegularHours() {
  const periods = [];
  for (const day of ["TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]) {
    periods.push(
      { openDay: day, openTime: { hours: 14, minutes: 30 }, closeDay: day, closeTime: { hours: 20, minutes: 30 } },
      { openDay: day, openTime: { hours: 21 }, closeDay: day, closeTime: { hours: 23 } }
    );
  }
  periods.push({ openDay: "SATURDAY", openTime: { hours: 21 }, closeDay: "SATURDAY", closeTime: { hours: 23 } });
  return { periods };
}

function hoursSignature(hours) {
  return (hours?.periods || []).map((period) => [
    period.openDay,
    Number(period.openTime?.hours || 0),
    Number(period.openTime?.minutes || 0),
    period.closeDay,
    Number(period.closeTime?.hours || 0),
    Number(period.closeTime?.minutes || 0)
  ].join(":"));
}

function profileFindings(profile, attributes, media, posts, foodMenus, googleUpdated) {
  const categories = [profile.categories?.primaryCategory?.name, ...(profile.categories?.additionalCategories || []).map((item) => item.name)].filter(Boolean);
  const attributeNames = new Set((attributes.attributes || []).map((item) => item.name));
  const serviceAreas = (profile.serviceArea?.places?.placeInfos || []).map((item) => item.placeName || item.placeId);
  const menuItemCount = (foodMenus.menus || []).reduce((total, menu) => total + (menu.sections || []).reduce((sum, section) => sum + (section.items || []).length, 0), 0);
  const findings = [];
  if (profile.title !== "Island Boy Kreationz Food Truck & Catering") findings.push("Business name differs from the verified real-world logo and website name.");
  if (profile.websiteUri !== "https://islandboykreationz.com/") findings.push("Website URL is not the preferred canonical homepage.");
  if (profile.categories?.primaryCategory?.name !== "categories/gcid:mobile_catering") findings.push("Mobile caterer is not the primary category.");
  if (!["categories/gcid:restaurant", "categories/gcid:catering_service", "categories/gcid:jamaican_restaurant", "categories/gcid:caribbean_restaurant"].every((item) => categories.includes(item))) findings.push("One or more verified restaurant/catering categories are missing.");
  if (JSON.stringify(normalizedServiceAreaCities(profile)) !== JSON.stringify([...desiredGbpServiceAreaCities].sort((left, right) => left.localeCompare(right)))) {
    findings.push("GBP service areas differ from the 18 normal Charlotte-metro and Triad markets. The six longer-distance website markets remain advance-booking only.");
  }
  if (JSON.stringify(hoursSignature(profile.regularHours)) !== JSON.stringify(hoursSignature(desiredRegularHours()))) findings.push("Regular GBP hours do not match the verified recurring truck schedule.");
  if ((profile.serviceItems || []).length < desiredServices().length) findings.push("Detailed GBP services are incomplete.");
  if (!attributeNames.has("attributes/url_instagram")) findings.push("Instagram is not linked to the profile.");
  if ((media.totalMediaItemCount || media.mediaItems?.length || 0) < 8) findings.push("Owner photo coverage is thin.");
  if (!(posts.localPosts || []).length) findings.push("No owner-created GBP posts are currently returned by the API.");
  if (profile.metadata?.canHaveFoodMenus && menuItemCount < 18) findings.push("The structured menu has fewer items than the verified website menu.");
  if (googleUpdated.diffMask) findings.push("Google has suggested profile updates that need review.");
  if (googleUpdated.pendingMask) findings.push("Submitted profile edits are pending Google publication.");
  return { categories, serviceAreas, menuItemCount, findings };
}

async function auditProfile() {
  const token = await getGoogleAccessToken();
  if (!token || !rawLocationId()) throw new Error("Google OAuth or Island Boy GBP location is not configured for audit.");
  const [profile, attributes, media, posts, foodMenus, googleUpdated] = await Promise.all([
    fetchProfile(token), fetchAttributes(token), fetchMedia(token), fetchLocalPosts(token), fetchFoodMenus(token), fetchGoogleUpdated(token)
  ]);
  const summary = profileFindings(profile, attributes, media, posts, foodMenus, googleUpdated);
  const audit = {
    business: businessName(), fetchedAt: new Date().toISOString(), profile, attributes,
    media: { totalMediaItemCount: media.totalMediaItemCount ?? media.mediaItems?.length ?? 0, categories: [...new Set((media.mediaItems || []).map((item) => item.locationAssociation?.category).filter(Boolean))] },
    ownerPostCount: (posts.localPosts || []).length,
    foodMenu: { menuCount: (foodMenus.menus || []).length, itemCount: summary.menuItemCount },
    googleUpdated: { diffMask: googleUpdated.diffMask || "", pendingMask: googleUpdated.pendingMask || "" },
    categories: summary.categories, serviceAreas: summary.serviceAreas, findings: summary.findings
  };
  writeJsonIfChanged(profileAuditPath, audit);
  console.log(`Profile audit complete: ${audit.findings.length} finding(s), ${audit.media.totalMediaItemCount} media, ${audit.foodMenu.itemCount} menu items.`);
  return audit;
}

async function patchLocation(token, updateMask, body, { validateOnly = false, label = "locations.patch" } = {}) {
  const url = new URL(`https://mybusinessbusinessinformation.googleapis.com/v1/locations/${rawLocationId()}`);
  url.searchParams.set("updateMask", updateMask);
  if (validateOnly) url.searchParams.set("validateOnly", "true");
  return fetchJson(url, { method: "PATCH", headers: { ...authHeaders(token), "content-type": "application/json" }, body: JSON.stringify(body), label: `Google Business Profile ${label}${validateOnly ? " validation" : ""}` });
}

async function applyServices() {
  const token = await getGoogleAccessToken();
  const body = { name: `locations/${rawLocationId()}`, serviceItems: desiredServices() };
  await patchLocation(token, "serviceItems", body, { validateOnly: true, label: "serviceItems.patch" });
  const dryRun = args.has("--dry-run-services");
  const result = dryRun ? body : await patchLocation(token, "serviceItems", body, { label: "serviceItems.patch" });
  console.log(`GBP services ${dryRun ? "validated" : "updated"}: ${result.serviceItems?.length || body.serviceItems.length} items.`);
  return { validated: true, applied: !dryRun, count: result.serviceItems?.length || body.serviceItems.length };
}

async function applyRegularHours() {
  const token = await getGoogleAccessToken();
  const body = { name: `locations/${rawLocationId()}`, regularHours: desiredRegularHours() };
  await patchLocation(token, "regularHours", body, { validateOnly: true, label: "regularHours.patch" });
  const dryRun = args.has("--dry-run-hours");
  const result = dryRun ? body : await patchLocation(token, "regularHours", body, { label: "regularHours.patch" });
  console.log(`GBP recurring truck hours ${dryRun ? "validated" : "updated"}: ${result.regularHours?.periods?.length || body.regularHours.periods.length} periods.`);
  return { validated: true, applied: !dryRun, periodCount: result.regularHours?.periods?.length || body.regularHours.periods.length };
}

const verifiedMenuSections = [
  { name: "Meals & Bowls", description: "Current Island Boy truck meals and bowls.", items: [
    ["8 Wings", 1000, "Eight saucy wings; confirm the current flavor selection when ordering."],
    ["Oxtail Meal", 3000, "Slow-braised oxtails served as a full meal with verified Island Boy sides."],
    ["Oxtail Bowl", 2000, "Slow-braised oxtails over a bowl base with the current side options."],
    ["Wing Bowl", 1500, "Seasoned wings served bowl-style with the current rice and side choices."],
    ["Wing Meal", 2400, "Seasoned wings served as a full meal with verified sides."],
    ["Chopped Chicken Bowl", 1500, "Chopped seasoned chicken served bowl-style with current rice and sides."],
    ["Chopped Chicken Meal", 2200, "Chopped seasoned chicken served as a full meal with verified sides."],
    ["Shrimp Bowl", 1600, "Seasoned shrimp served bowl-style with current rice and side choices."],
    ["Salmon Bowl", 1800, "Seasoned salmon served bowl-style with current rice and side choices."]
  ]},
  { name: "Sides", description: "Verified Island Boy side dishes.", items: [
    ["Rice & Peas", 500, "Caribbean-style rice and peas."], ["Yellow Rice", 500, "Seasoned yellow rice."],
    ["Cabbage", 500, "Seasoned cooked cabbage."], ["Candied Yams", 500, "Sweet candied yams."],
    ["Baked Beans", 500, "Island Boy baked beans."], ["Mac & Cheese", 500, "Baked macaroni and cheese."],
    ["Cornbread", 500, "Cornbread side."]
  ]},
  { name: "Desserts & Drinks", description: "Current dessert and drink options.", items: [
    ["Cake", 500, "Current cake selection; ask what is available today."], ["Drink", 500, "Current cold drink selection."]
  ]}
];

function centsToMoney(cents) { return { currencyCode: "USD", units: Math.floor(cents / 100), nanos: (cents % 100) * 10000000 }; }

function foodMenuSignature(foodMenus) {
  return (foodMenus.menus || []).map((menu) => ({
    sourceUrl: menu.sourceUrl || "",
    sections: (menu.sections || []).map((section) => ({
      labels: section.labels || [],
      items: (section.items || []).map((item) => ({
        labels: item.labels || [],
        attributes: {
          price: {
            currencyCode: item.attributes?.price?.currencyCode || "",
            units: Number(item.attributes?.price?.units || 0),
            nanos: Number(item.attributes?.price?.nanos || 0)
          },
          ...((item.attributes?.mediaKeys || []).length ? { mediaKeys: [...item.attributes.mediaKeys] } : {})
        }
      }))
    }))
  }));
}

function buildFoodMenu(current) {
  const mediaByName = new Map();
  for (const menu of current.menus || []) for (const section of menu.sections || []) for (const item of section.items || []) {
    const name = item.labels?.[0]?.displayName;
    if (name && item.attributes?.mediaKeys?.length) mediaByName.set(name.toLowerCase(), [...item.attributes.mediaKeys]);
  }
  return { name: `${locationName()}/foodMenus`, menus: [{
    labels: [{ displayName: "Island Boy Kreationz Menu", description: "Current food truck meals, bowls, sides, desserts and drinks. Availability can change; confirm before driving or ordering.", languageCode: "en" }],
    sourceUrl: "https://islandboykreationz.com/order.html",
    cuisines: current.menus?.[0]?.cuisines || [],
    sections: verifiedMenuSections.map((section) => ({ labels: [{ displayName: section.name, description: section.description, languageCode: "en" }], items: section.items.map(([name, cents, description]) => ({ labels: [{ displayName: name, description, languageCode: "en" }], attributes: { price: centsToMoney(cents), ...(mediaByName.get(name.toLowerCase()) ? { mediaKeys: mediaByName.get(name.toLowerCase()) } : {}) } })) }))
  }] };
}

async function syncFoodMenu() {
  const token = await getGoogleAccessToken();
  const profile = await fetchProfile(token);
  if (!profile.metadata?.canHaveFoodMenus) throw new Error("Island Boy GBP is not eligible for structured food menus.");
  const current = await fetchFoodMenus(token);
  const desired = buildFoodMenu(current);
  const changed = JSON.stringify(foodMenuSignature(current)) !== JSON.stringify(foodMenuSignature(desired));
  const dryRun = args.has("--dry-run-food-menu");
  let published = current;
  if (changed && !dryRun) {
    const url = new URL(`https://mybusiness.googleapis.com/v4/${locationName()}/foodMenus`);
    url.searchParams.set("updateMask", "menus");
    await fetchJson(url, { method: "PATCH", headers: { ...authHeaders(token), "content-type": "application/json" }, body: JSON.stringify(desired), label: "Google Business Profile foodMenus.update" });
    published = await fetchFoodMenus(token);
  }
  const publishedCount = (published.menus || []).reduce((total, menu) => total + (menu.sections || []).reduce((sum, section) => sum + (section.items || []).length, 0), 0);
  const report = { business: businessName(), syncedAt: new Date().toISOString(), dryRun, changed, itemCount: 18, publishedCount, desired, google: published };
  writeJsonIfChanged(foodMenuPath, report);
  console.log(`GBP food menu ${dryRun ? "validated" : changed ? "updated" : "already current"}: ${publishedCount || 18} items.`);
  return report;
}

const ratingMap = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

function normalizeReview(review) {
  const reply = review.reviewReply || null;
  return {
    id: review.reviewId || review.name || "",
    name: review.name || "",
    author: review.reviewer?.displayName || "Google reviewer",
    profilePhotoUrl: review.reviewer?.profilePhotoUrl || null,
    rating: ratingMap[review.starRating] || Number(review.starRating || 0),
    text: review.comment || "",
    createTime: review.createTime || null,
    updateTime: review.updateTime || null,
    reply: reply?.comment || null,
    replyUpdateTime: reply?.updateTime || null
  };
}

async function fetchReviews() {
  const token = await getGoogleAccessToken();
  const location = locationName();
  if (!token || !location) throw new Error("Google OAuth or Island Boy GBP location is not configured.");

  const reviews = [];
  let pageToken = "";
  let averageRating = null;
  let totalReviewCount = null;
  do {
    const url = new URL(`https://mybusiness.googleapis.com/v4/${location}/reviews`);
    url.searchParams.set("pageSize", "50");
    url.searchParams.set("orderBy", "updateTime desc");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const payload = await fetchJson(url, {
      headers: authHeaders(token),
      label: "Google Business Profile reviews.list"
    });
    averageRating ??= payload.averageRating ?? null;
    totalReviewCount ??= payload.totalReviewCount ?? null;
    reviews.push(...(payload.reviews || []));
    pageToken = payload.nextPageToken || "";
  } while (pageToken);

  return {
    business: businessName(),
    source: "google-business-profile",
    rating: Number(averageRating || 0),
    reviewCount: Number(totalReviewCount ?? reviews.length),
    lastFetchedAt: new Date().toISOString(),
    expectedManagerEmail: process.env.GOOGLE_BUSINESS_PROFILE_MANAGER_EMAIL || "s4aiagency@gmail.com",
    reviews: reviews.map(normalizeReview)
  };
}

function reviewSnapshot(data) {
  if (!data?.lastFetchedAt || !Array.isArray(data.reviews)) return null;
  const ratingBreakdown = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  let answeredCount = 0;
  let latestReviewAt = null;
  for (const review of data.reviews) {
    const rating = String(Number(review.rating || 0));
    if (rating in ratingBreakdown) ratingBreakdown[rating] += 1;
    if (review.reply) answeredCount += 1;
    if (review.createTime && (!latestReviewAt || review.createTime > latestReviewAt)) latestReviewAt = review.createTime;
  }
  const reviewCount = Number(data.reviewCount || data.reviews.length);
  return {
    snapshotDate: localDateKey(new Date(data.lastFetchedAt)),
    fetchedAt: data.lastFetchedAt,
    rating: Number(data.rating || 0),
    reviewCount,
    ratingBreakdown,
    answeredCount,
    unansweredCount: Math.max(0, reviewCount - answeredCount),
    responseRatePercent: reviewCount ? Math.round((answeredCount / reviewCount) * 1000) / 10 : 0,
    latestReviewAt
  };
}

function recordReviewHistory(previousData, currentData) {
  return upsertHistory(
    reviewHistoryPath,
    "google-business-profile-reviews",
    "snapshotDate",
    [reviewSnapshot(previousData), reviewSnapshot(currentData)]
  );
}

function firstName(author) {
  const name = String(author || "").trim();
  if (!name || name === "Google reviewer") return "";
  return name.split(/\s+/)[0].replace(/[^\p{L}'-]/gu, "");
}

function reviewDetail(review) {
  const text = String(review.text || "").toLowerCase();
  const details = [
    [/oxtail/, "the oxtails"],
    [/wing/, "the wings"],
    [/jerk/, "the jerk flavors"],
    [/salmon|shrimp|seafood/, "the seafood"],
    [/mac|cabbage|yam|rice|side/, "the food and sides"],
    [/cake|dessert/, "the desserts"],
    [/portion/, "the generous portions"],
    [/service|friendly|professional|customer/, "the food and service"],
    [/cater|event|party/, "your event experience"]
  ];
  return details.find(([pattern]) => pattern.test(text))?.[1] || "your experience";
}

function fallbackReply(review) {
  const name = firstName(review.author);
  const greeting = name ? `, ${name}` : "";
  if (review.rating >= 4) {
    return `Thank you so much${greeting}! We truly appreciate you supporting Island Boy Kreationz, and we are glad you enjoyed ${reviewDetail(review)}. We look forward to serving you again.`;
  }
  return `Thank you for sharing this feedback${greeting}. We are sorry your experience missed the mark. Please call or text us at 980-785-8372 so we can understand what happened and work to make it right.`;
}

async function draftReply(review) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return fallbackReply(review);
  const payload = await fetchJson("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "http-referer": "https://islandboykreationz.com",
      "x-title": "Island Boy Review Reply Automation"
    },
    body: JSON.stringify({
      model: process.env.ISLAND_BOY_REVIEW_REPLY_MODEL || "openai/gpt-4.1-nano",
      temperature: 0.3,
      max_tokens: 120,
      messages: [
        {
          role: "system",
          content: "Write one warm, concise Google Business Profile owner reply for Island Boy Kreationz Food Truck & Catering. Return only the reply, under 55 words. Do not invent details or offer incentives. For negative feedback, acknowledge it and invite direct follow-up without arguing."
        },
        {
          role: "user",
          content: JSON.stringify({ reviewer: review.author, rating: review.rating, review: review.text })
        }
      ]
    }),
    label: "OpenRouter review reply draft"
  });
  return payload?.choices?.[0]?.message?.content?.trim() || fallbackReply(review);
}

async function replyToUnanswered(data) {
  const token = await getGoogleAccessToken();
  const limit = Number(process.env.ISLAND_BOY_REVIEW_REPLY_LIMIT || 5);
  const unanswered = data.reviews.filter((review) => review.name && !review.reply).slice(0, limit);
  const dryRun = args.has("--dry-run-replies") || process.env.ISLAND_BOY_REVIEW_REPLY_DRY_RUN === "1";
  let published = 0;

  for (const review of unanswered) {
    const comment = await draftReply(review);
    if (dryRun) {
      console.log(`[dry-run] Would reply to ${review.id}: ${comment}`);
      continue;
    }
    await fetchJson(`https://mybusiness.googleapis.com/v4/${review.name}/reply`, {
      method: "PUT",
      headers: { ...authHeaders(token), "content-type": "application/json" },
      body: JSON.stringify({ comment }),
      label: "Google Business Profile reviews.updateReply"
    });
    review.reply = comment;
    review.replyUpdateTime = new Date().toISOString();
    published += 1;
    console.log(`Replied to review ${review.id}`);
  }
  return { attempted: unanswered.length, published };
}

function defaultSchedule() {
  return {
    timezone: "America/New_York",
    phone: "980-785-8372",
    instagram: "@islandboy_kreationz",
    hunterAvenue: "6100 Hunter Ave, Charlotte, NC 28262",
    regular: {
      monday: { status: "no-regular-stop" },
      tuesday: { status: "open", stops: ["6100 Hunter Ave from 2:30–8:30 PM", "Amazon late stop from 9–11 PM"] },
      wednesday: { status: "open", stops: ["6100 Hunter Ave from 2:30–8:30 PM", "Amazon late stop from 9–11 PM"] },
      thursday: { status: "open", stops: ["6100 Hunter Ave from 2:30–8:30 PM", "Amazon late stop from 9–11 PM"] },
      friday: { status: "open", stops: ["6100 Hunter Ave from 2:30–8:30 PM", "Amazon late stop from 9–11 PM"] },
      saturday: { status: "moving", stops: ["Amazon late stop from 9–11 PM"] },
      sunday: { status: "no-regular-stop" }
    },
    dateOverrides: {}
  };
}

function readSchedule() {
  const configured = readJson(schedulePath, {});
  const fallback = defaultSchedule();
  return {
    ...fallback,
    ...configured,
    regular: { ...fallback.regular, ...(configured.regular || {}) },
    dateOverrides: configured.dateOverrides || {}
  };
}

function cateringPost(index = 0) {
  const options = [
    {
      kind: "catering",
      url: "https://islandboykreationz.com/contact",
      summary: "No regular truck stop is scheduled today, but Island Boy Kreationz is taking catering requests. Planning an office lunch, birthday, church event, school function, community day, or private celebration? Send the date, location, and guest count so we can recommend the right setup."
    },
    {
      kind: "party-trays",
      url: "https://islandboykreationz.com/tray-catering-nc",
      summary: "No regular truck stop is scheduled today. Need food for a gathering? Island Boy Kreationz offers party trays and drop-off catering for offices, churches, birthdays, family events, and private celebrations across the Charlotte area."
    },
    {
      kind: "food-truck-catering",
      url: "https://islandboykreationz.com/food-truck-catering-nc",
      summary: "No regular truck stop is scheduled today. Bring the Island Boy Kreationz food truck to your next event for Caribbean flavor, generous portions, and an experience your guests will remember. Request catering details on our website."
    }
  ];
  return options[Number(index || 0) % options.length];
}

function menuSpotlightPost() {
  return {
    kind: "menu-spotlight",
    url: "https://islandboykreationz.com/order",
    summary: "No regular truck stop is scheduled today, so plan your next Island Boy pull-up. Browse oxtails, curry chicken, wings, salmon, shrimp bowls, homemade sides, desserts, drinks, and current ordering details on our website. Follow @islandboy_kreationz for the next confirmed location update."
  };
}

function dailyPostFor(date, state) {
  const schedule = readSchedule();
  const dateKey = localDateKey(date);
  const weekday = localWeekday(date);
  const override = schedule.dateOverrides?.[dateKey];
  if (override?.summary) {
    return {
      kind: override.kind || "schedule-override",
      summary: override.summary,
      url: override.url || "https://islandboykreationz.com"
    };
  }
  if (override?.status === "closed") return cateringPost(state.postIndex);

  if (weekday === "tuesday") {
    return {
      kind: "weekly-schedule",
      url: "https://islandboykreationz.com",
      summary: "This week’s regular Island Boy Kreationz truck schedule: Tuesday–Friday at 6100 Hunter Ave from 2:30–8:30 PM, plus the Amazon late stop Tuesday–Saturday from 9–11 PM. Saturday daytime locations can move. Sunday and Monday have no regular truck stop. Check Instagram @islandboy_kreationz or text 980-785-8372 before driving in case the schedule changes. Catering requests are always welcome."
    };
  }

  const day = override || schedule.regular?.[weekday] || {};
  if (day.status === "open") {
    return {
      kind: "today-location",
      url: "https://islandboykreationz.com/order",
      summary: `Today’s regular Island Boy Kreationz stops: ${(day.stops || []).join(", then ")}. Schedule changes can happen, so check Instagram ${schedule.instagram} or text ${schedule.phone} before driving. See the menu and ordering details on our website.`
    };
  }
  if (day.status === "moving") {
    return {
      kind: "moving-location",
      url: "https://www.instagram.com/islandboy_kreationz/",
      summary: `Saturday daytime locations can move. Check Instagram ${schedule.instagram} or text ${schedule.phone} for today’s confirmed daytime location before driving. The regular Amazon late stop is scheduled from 9–11 PM unless an update is posted.`
    };
  }
  if (weekday === "sunday") return menuSpotlightPost();
  return cateringPost(state.postIndex);
}

function shouldPost(state, date = new Date()) {
  if (args.has("--force-post")) return true;
  if (!state.lastPostedAt) return true;
  return (state.lastPostedDate || localDateKey(new Date(state.lastPostedAt))) !== localDateKey(date);
}

async function legacyMaybePost() {
  const state = readJson(postStatePath, { postIndex: 0, posts: [] });
  const postDate = process.env.ISLAND_BOY_POST_DATE
    ? new Date(`${process.env.ISLAND_BOY_POST_DATE}T12:00:00`)
    : new Date();
  if (!shouldPost(state, postDate)) {
    console.log(`Skipping Google post; lastPostedAt=${state.lastPostedAt}`);
    return { attempted: false, published: false };
  }
  const selected = dailyPostFor(postDate, state);
  if (args.has("--dry-run-post")) {
    console.log(`[dry-run] Would create Google post: ${selected.summary} ${selected.url}`);
    return { attempted: true, published: false };
  }
  const token = await getGoogleAccessToken();
  const location = locationName();
  const result = await fetchJson(`https://mybusiness.googleapis.com/v4/${location}/localPosts`, {
    method: "POST",
    headers: { ...authHeaders(token), "content-type": "application/json" },
    body: JSON.stringify({
      languageCode: "en-US",
      summary: selected.summary,
      topicType: "STANDARD",
      callToAction: { actionType: "LEARN_MORE", url: selected.url }
    }),
    label: "Google Business Profile localPosts.create"
  });
  const nextState = {
    lastPostedAt: new Date().toISOString(),
    lastPostedDate: localDateKey(postDate),
    postIndex: Number(state.postIndex || 0) + 1,
    posts: [
      { createdAt: new Date().toISOString(), name: result.name || null, ...selected },
      ...(state.posts || [])
    ].slice(0, 50)
  };
  writeJsonIfChanged(postStatePath, nextState);
  console.log(`Created Google post ${result.name || "(no resource name returned)"}`);
  return { attempted: true, published: true };
}

function fetchNativeJson(url, headers = {}, label = "Request") {
  return new Promise((resolve, reject) => {
    const request = httpsGet(url, { headers }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => {
        let payload;
        try { payload = body ? JSON.parse(body) : {}; } catch { payload = { raw: body }; }
        if ((response.statusCode || 500) >= 400) return reject(new Error(`${label} failed: ${response.statusCode}`));
        resolve(payload);
      });
    });
    request.on("error", reject);
  });
}

async function fetchInstagramProfile() {
  const username = process.env.ISLAND_BOY_INSTAGRAM_USERNAME || "islandboy_kreationz";
  const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
  return fetchNativeJson(url, {
    "x-ig-app-id": process.env.ISLAND_BOY_INSTAGRAM_WEB_APP_ID || "936619743392459",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140 Safari/537.36",
    accept: "application/json,text/plain,*/*", "accept-language": "en-US,en;q=0.9"
  }, "Instagram public profile feed");
}

function normalizeInstagramPosts(payload) {
  const user = payload?.data?.user || {};
  const posts = (user.edge_owner_to_timeline_media?.edges || []).map(({ node }) => ({
    shortcode: node.shortcode,
    publishedAt: node.taken_at_timestamp ? new Date(node.taken_at_timestamp * 1000).toISOString() : null,
    caption: node.edge_media_to_caption?.edges?.[0]?.node?.text || "",
    imageUrl: node.display_url || null,
    isVideo: Boolean(node.is_video),
    permalink: node.shortcode ? `https://www.instagram.com/p/${node.shortcode}/` : null
  })).filter((post) => post.shortcode).sort((left, right) => String(right.publishedAt).localeCompare(String(left.publishedAt)));
  return { username: user.username || "islandboy_kreationz", fullName: user.full_name || "IslandBoyKreationz Food Truck", biography: user.biography || "", followers: user.edge_followed_by?.count ?? null, fetchedAt: new Date().toISOString(), posts };
}

function isScheduleAnnouncement(post) {
  const caption = String(post.caption || "");
  return /(weekly schedule|where (?:we|we're|were) serving this week|this week(?:'s|s)? schedule)/i.test(caption)
    || (/(hunter ave|6100 hunter|amazon)/i.test(caption) && /(tue|wed|thu|fri|sat|2:30|8:30|9\s*(?:pm|p\.m\.)|11\s*(?:pm|p\.m\.))/i.test(caption));
}

function latestFreshSchedule(feed) {
  const maxAgeDays = Number(process.env.ISLAND_BOY_INSTAGRAM_SCHEDULE_MAX_AGE_DAYS || 10);
  const cutoff = Date.now() - maxAgeDays * 86400000;
  return (feed.posts || []).find((post) => isScheduleAnnouncement(post) && new Date(post.publishedAt).getTime() >= cutoff) || null;
}

function compactInstagramSummary(caption) {
  const cleaned = String(caption || "").replace(/(?:\s*#\S+){3,}\s*$/s, "").replace(/\n{3,}/g, "\n\n").trim();
  const lead = "Weekly schedule from @islandboy_kreationz:\n\n";
  if ((lead + cleaned).length <= 1450) return lead + cleaned;
  const clipped = cleaned.slice(0, 1375);
  return `${lead}${clipped.slice(0, Math.max(clipped.lastIndexOf(" "), 1280)).trim()}...`;
}

function trackedPostUrl(url, kind) {
  if (!url.startsWith("https://islandboykreationz.com")) return url;
  const tracked = new URL(url);
  tracked.searchParams.set("utm_source", "google");
  tracked.searchParams.set("utm_medium", "organic");
  tracked.searchParams.set("utm_campaign", "gbp_posts");
  tracked.searchParams.set("utm_content", kind);
  return tracked.toString();
}

function canPublishEvergreen(state, date) {
  if (args.has("--force-post")) return true;
  if (!state.lastPostedAt) return true;
  const hours = (date.getTime() - new Date(state.lastPostedAt).getTime()) / 3600000;
  return hours >= Number(process.env.ISLAND_BOY_POST_MIN_HOURS || 72) && ["tuesday", "thursday", "saturday"].includes(localWeekday(date));
}

async function maybePost() {
  const token = await getGoogleAccessToken();
  if (!token || !locationName()) throw new Error("Google OAuth or Island Boy GBP location is not configured for posts.");
  const state = readJson(postStatePath, { postIndex: 0, posts: [] });
  const postDate = process.env.ISLAND_BOY_POST_DATE ? new Date(`${process.env.ISLAND_BOY_POST_DATE}T12:00:00`) : new Date();
  const dryRun = args.has("--dry-run-post");
  let feed;
  try {
    feed = normalizeInstagramPosts(await fetchInstagramProfile());
    writeJsonIfChanged(instagramPath, feed);
  } catch (error) {
    console.warn(`Instagram schedule check failed: ${error.message}`);
    feed = readJson(instagramPath, { posts: [] });
  }
  const schedule = latestFreshSchedule(feed);
  let selected = null;
  if (schedule && (args.has("--force-instagram-post") || schedule.shortcode !== state.lastInstagramShortcode)) {
    selected = { kind: "instagram-weekly-schedule", summary: compactInstagramSummary(schedule.caption), url: schedule.permalink, instagramShortcode: schedule.shortcode, sourcePublishedAt: schedule.publishedAt };
  } else if (canPublishEvergreen(state, postDate)) {
    selected = dailyPostFor(postDate, state);
    selected.url = trackedPostUrl(selected.url, selected.kind);
  }
  if (!selected) {
    console.log("Skipping Google post; no new Instagram schedule and the three-post weekly cadence is not due.");
    return { attempted: false, published: false, reason: "not-due", latestInstagramShortcode: schedule?.shortcode || null };
  }
  if (dryRun) {
    console.log(`[dry-run] Would create ${selected.kind} Google post: ${selected.summary} ${selected.url}`);
    return { attempted: true, published: false, kind: selected.kind, latestInstagramShortcode: schedule?.shortcode || null };
  }
  const result = await fetchJson(`https://mybusiness.googleapis.com/v4/${locationName()}/localPosts`, {
    method: "POST", headers: { ...authHeaders(token), "content-type": "application/json" },
    body: JSON.stringify({ languageCode: "en-US", summary: selected.summary, topicType: "STANDARD", callToAction: { actionType: "LEARN_MORE", url: selected.url } }),
    label: "Google Business Profile localPosts.create"
  });
  const nextState = {
    ...state, lastPostedAt: new Date().toISOString(), lastPostedDate: localDateKey(postDate),
    lastInstagramShortcode: selected.instagramShortcode || state.lastInstagramShortcode || null,
    lastInstagramCheckedAt: feed.fetchedAt || new Date().toISOString(),
    postIndex: Number(state.postIndex || 0) + (selected.kind === "instagram-weekly-schedule" ? 0 : 1),
    posts: [{ createdAt: new Date().toISOString(), name: result.name || null, ...selected }, ...(state.posts || [])].slice(0, 100)
  };
  writeJsonIfChanged(postStatePath, nextState);
  console.log(`Created Google post: ${selected.kind}.`);
  return { attempted: true, published: true, kind: selected.kind, resourceName: result.name || null, latestInstagramShortcode: schedule?.shortcode || null };
}

const performanceMetrics = [
  "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
  "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
  "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
  "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
  "BUSINESS_DIRECTION_REQUESTS",
  "CALL_CLICKS",
  "WEBSITE_CLICKS",
  "BUSINESS_FOOD_ORDERS",
  "BUSINESS_FOOD_MENU_CLICKS"
];

function shiftDate(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function googleDate(date) {
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}

function dateKeyFromGoogle(value = {}) {
  return `${String(value.year || 0).padStart(4, "0")}-${String(value.month || 0).padStart(2, "0")}-${String(value.day || 0).padStart(2, "0")}`;
}

function insightNumber(value) {
  if (typeof value === "number" || typeof value === "string") return Number(value || 0);
  return Number(value?.value ?? value?.threshold ?? 0);
}

function percentChange(current, previous) {
  if (!previous) return current ? null : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function sumRange(daily, startKey, endKey) {
  return Object.entries(daily || {}).reduce((sum, [date, value]) => {
    return date >= startKey && date <= endKey ? sum + Number(value || 0) : sum;
  }, 0);
}

function summarizePerformance(payload, range) {
  const dailyByMetric = Object.fromEntries(performanceMetrics.map((metric) => [metric, {}]));
  for (const group of payload.multiDailyMetricTimeSeries || []) {
    for (const series of group.dailyMetricTimeSeries || []) {
      const metric = series.dailyMetric;
      if (!metric) continue;
      dailyByMetric[metric] ||= {};
      for (const point of series.timeSeries?.datedValues || []) {
        const dateKey = dateKeyFromGoogle(point.date);
        dailyByMetric[metric][dateKey] = Number(dailyByMetric[metric][dateKey] || 0) + insightNumber(point.value);
      }
    }
  }

  const currentStart = localDateKey(shiftDate(range.end, -27));
  const currentEnd = localDateKey(range.end);
  const previousStart = localDateKey(range.start);
  const previousEnd = localDateKey(shiftDate(range.end, -28));
  const metrics = {};
  for (const metric of performanceMetrics) {
    const current = sumRange(dailyByMetric[metric], currentStart, currentEnd);
    const previous = sumRange(dailyByMetric[metric], previousStart, previousEnd);
    metrics[metric] = { current28Days: current, previous28Days: previous, changePercent: percentChange(current, previous), daily: dailyByMetric[metric] };
  }

  const impressionNames = performanceMetrics.filter((metric) => metric.startsWith("BUSINESS_IMPRESSIONS_"));
  const total = (names, field) => names.reduce((sum, metric) => sum + Number(metrics[metric]?.[field] || 0), 0);
  const summary = {
    impressions: {
      current28Days: total(impressionNames, "current28Days"),
      previous28Days: total(impressionNames, "previous28Days")
    },
    directionRequests: metrics.BUSINESS_DIRECTION_REQUESTS.current28Days,
    callClicks: metrics.CALL_CLICKS.current28Days,
    websiteClicks: metrics.WEBSITE_CLICKS.current28Days,
    foodOrders: metrics.BUSINESS_FOOD_ORDERS.current28Days,
    menuClicks: metrics.BUSINESS_FOOD_MENU_CLICKS.current28Days
  };
  summary.impressions.changePercent = percentChange(summary.impressions.current28Days, summary.impressions.previous28Days);
  summary.totalActions = summary.directionRequests + summary.callClicks + summary.websiteClicks + summary.foodOrders + summary.menuClicks;
  summary.actionRatePercent = summary.impressions.current28Days
    ? Math.round((summary.totalActions / summary.impressions.current28Days) * 1000) / 10
    : 0;

  const recommendations = [];
  if (summary.directionRequests >= Math.max(summary.callClicks, summary.websiteClicks)) {
    recommendations.push("Keep daily location and schedule posts prominent; direction requests are the strongest tracked action.");
  }
  if (summary.websiteClicks < Math.max(5, Math.round(summary.impressions.current28Days * 0.01))) {
    recommendations.push("Use stronger website and catering calls to action because website clicks are low relative to profile visibility.");
  }
  if (summary.menuClicks < Math.max(3, summary.websiteClicks * 0.25)) {
    recommendations.push("Publish more menu, plate, and ordering content to increase food-menu engagement.");
  }
  if (summary.callClicks > summary.websiteClicks) {
    recommendations.push("Keep the phone/text instruction visible because customers currently favor direct contact over website clicks.");
  }
  if (summary.impressions.changePercent !== null && summary.impressions.changePercent < 0) {
    recommendations.push("Profile impressions declined versus the prior 28 days; refresh food photos, service details, and locally specific post copy.");
  }
  if (!recommendations.length) recommendations.push("Continue the Tuesday schedule, daily location, and catering rotation and review the next 28-day comparison.");

  return {
    fetchedAt: new Date().toISOString(),
    source: "google-business-profile-performance",
    range: { previousStart, previousEnd, currentStart, currentEnd },
    summary,
    metrics,
    recommendations
  };
}

function performanceSnapshot(report) {
  if (!report?.fetchedAt || !report?.range?.currentEnd || !report?.summary) return null;
  return {
    currentEnd: report.range.currentEnd,
    fetchedAt: report.fetchedAt,
    range: report.range,
    summary: report.summary,
    recommendations: report.recommendations || []
  };
}

function recordPerformanceHistory(previousReport, currentReport) {
  return upsertHistory(
    performanceHistoryPath,
    "google-business-profile-performance",
    "currentEnd",
    [performanceSnapshot(previousReport), performanceSnapshot(currentReport)]
  );
}

async function syncPerformanceAnalytics() {
  const previousReport = readJson(performancePath, null);
  const token = await getGoogleAccessToken();
  const rawLocation = process.env.GOOGLE_BUSINESS_PROFILE_LOCATION_ID || "";
  const locationId = rawLocation.split("/").filter(Boolean).pop();
  if (!token || !locationId) throw new Error("Google OAuth or Island Boy GBP location is not configured for analytics.");

  const end = shiftDate(new Date(), -1);
  const start = shiftDate(end, -55);
  const startParts = googleDate(start);
  const endParts = googleDate(end);
  const url = new URL(`https://businessprofileperformance.googleapis.com/v1/locations/${locationId}:fetchMultiDailyMetricsTimeSeries`);
  for (const metric of performanceMetrics) url.searchParams.append("dailyMetrics", metric);
  url.searchParams.set("dailyRange.start_date.year", String(startParts.year));
  url.searchParams.set("dailyRange.start_date.month", String(startParts.month));
  url.searchParams.set("dailyRange.start_date.day", String(startParts.day));
  url.searchParams.set("dailyRange.end_date.year", String(endParts.year));
  url.searchParams.set("dailyRange.end_date.month", String(endParts.month));
  url.searchParams.set("dailyRange.end_date.day", String(endParts.day));
  const payload = await fetchJson(url, {
    headers: authHeaders(token),
    label: "Google Business Profile performance.fetchMultiDailyMetricsTimeSeries"
  });
  const report = summarizePerformance(payload, { start, end });
  writeJsonIfChanged(performancePath, report);
  recordPerformanceHistory(previousReport, report);
  console.log(`GBP analytics synced: impressions=${report.summary.impressions.current28Days} actions=${report.summary.totalActions} actionRate=${report.summary.actionRatePercent}%`);
  return report;
}

function searchConsoleSiteUrl() {
  return process.env.ISLAND_BOY_SEARCH_CONSOLE_SITE_URL || "https://islandboykreationz.com/";
}

async function searchConsoleQuery(token, body) {
  return fetchJson(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(searchConsoleSiteUrl())}/searchAnalytics/query`, {
    method: "POST", headers: { ...authHeaders(token), "content-type": "application/json" },
    body: JSON.stringify({ dataState: "final", ...body }), label: "Google Search Console searchAnalytics.query"
  });
}

function searchMetricRow(row = {}) {
  return { clicks: Number(row.clicks || 0), impressions: Number(row.impressions || 0), ctrPercent: Math.round(Number(row.ctr || 0) * 1000) / 10, position: Math.round(Number(row.position || 0) * 10) / 10 };
}

function searchMetricComparison(current = {}, previous = {}) {
  const currentMetrics = searchMetricRow(current);
  const previousMetrics = searchMetricRow(previous);
  return { current28Days: currentMetrics, previous28Days: previousMetrics, changePercent: { clicks: percentChange(currentMetrics.clicks, previousMetrics.clicks), impressions: percentChange(currentMetrics.impressions, previousMetrics.impressions) } };
}

async function syncSearchConsoleAnalytics() {
  const previousReport = readJson(searchConsolePath, null);
  const token = await getGoogleAccessToken();
  if (!token) throw new Error("Google OAuth credentials are not configured for Search Console.");
  const currentEndDate = localDateKey(shiftDate(new Date(), -3));
  const currentStartDate = localDateKey(shiftDate(new Date(), -30));
  const previousEndDate = localDateKey(shiftDate(new Date(), -31));
  const previousStartDate = localDateKey(shiftDate(new Date(), -58));
  const range = (startDate, endDate, dimensions = [], rowLimit = 25000) => ({ startDate, endDate, dimensions, rowLimit, aggregationType: dimensions.includes("page") ? "byPage" : "auto" });
  const [currentTotal, previousTotal, currentQueries, previousQueries, currentPages, sitemaps] = await Promise.all([
    searchConsoleQuery(token, range(currentStartDate, currentEndDate, [], 1)),
    searchConsoleQuery(token, range(previousStartDate, previousEndDate, [], 1)),
    searchConsoleQuery(token, range(currentStartDate, currentEndDate, ["query"], 100)),
    searchConsoleQuery(token, range(previousStartDate, previousEndDate, ["query"], 100)),
    searchConsoleQuery(token, range(currentStartDate, currentEndDate, ["page"], 100)),
    fetchJson(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(searchConsoleSiteUrl())}/sitemaps`, { headers: authHeaders(token), label: "Google Search Console sitemaps.list" })
  ]);
  const previousQueryMap = new Map((previousQueries.rows || []).map((row) => [String(row.keys?.[0] || ""), row]));
  const topQueries = (currentQueries.rows || []).slice(0, 20).map((row) => ({ query: row.keys?.[0] || "", ...searchMetricComparison(row, previousQueryMap.get(row.keys?.[0]) || {}) }));
  const topPages = (currentPages.rows || []).slice(0, 20).map((row) => ({ page: row.keys?.[0] || "", ...searchMetricRow(row) }));
  const summary = searchMetricComparison(currentTotal.rows?.[0] || {}, previousTotal.rows?.[0] || {});
  const sitemapStatus = (sitemaps.sitemap || []).map((item) => ({ path: item.path, lastSubmitted: item.lastSubmitted || null, lastDownloaded: item.lastDownloaded || null, isPending: Boolean(item.isPending), errors: Number(item.errors || 0), warnings: Number(item.warnings || 0) }));
  const recommendations = [];
  if (!summary.current28Days.impressions) recommendations.push("Search Console is building its first Island Boy baseline; recheck after Google processes the new property and sitemap.");
  if (summary.current28Days.impressions && summary.current28Days.ctrPercent < 2.5) recommendations.push("Improve titles and descriptions on high-impression, low-CTR pages.");
  if (topQueries.some((item) => item.current28Days.position >= 8 && item.current28Days.position <= 20)) recommendations.push("Strengthen near-page-one queries with real event proof, internal links, photos, and specific service details.");
  if (sitemapStatus.some((item) => item.errors || item.warnings)) recommendations.push("Resolve Search Console sitemap warnings before publishing additional pages.");
  if (!recommendations.length) recommendations.push("Keep the verified pages current and focus on reviews, local links, and real event content.");
  const report = { fetchedAt: new Date().toISOString(), source: "google-search-console", site: searchConsoleSiteUrl(), range: { previousStartDate, previousEndDate, currentStartDate, currentEndDate }, summary, topQueries, topPages, sitemaps: sitemapStatus, recommendations };
  writeJsonIfChanged(searchConsolePath, report);
  upsertHistory(searchConsoleHistoryPath, "google-search-console", "currentEndDate", [
    previousReport?.range?.currentEndDate ? { currentEndDate: previousReport.range.currentEndDate, fetchedAt: previousReport.fetchedAt, summary: previousReport.summary } : null,
    { currentEndDate, fetchedAt: report.fetchedAt, summary }
  ]);
  console.log(`Search Console synced: clicks=${summary.current28Days.clicks} impressions=${summary.current28Days.impressions} CTR=${summary.current28Days.ctrPercent}%.`);
  return report;
}

function searchConsoleDigest(report) {
  const summary = report.summary;
  const clickChange = summary.changePercent.clicks === null ? "new baseline" : `${summary.changePercent.clicks >= 0 ? "+" : ""}${summary.changePercent.clicks}% vs prior 28 days`;
  return ["✅ Island Boy Search Console report complete", `Clicks: ${summary.current28Days.clicks} (${clickChange})`, `Impressions: ${summary.current28Days.impressions} | CTR: ${summary.current28Days.ctrPercent}% | Avg position: ${summary.current28Days.position}`, `Top query: ${report.topQueries[0]?.query || "baseline still processing"}`, `Sitemap issues: ${report.sitemaps.reduce((sum, item) => sum + item.errors + item.warnings, 0)}`, `Next focus: ${report.recommendations[0]}`].join("\n");
}

function analyticsDigest(report) {
  const summary = report.summary;
  const change = summary.impressions.changePercent === null
    ? "new baseline"
    : `${summary.impressions.changePercent >= 0 ? "+" : ""}${summary.impressions.changePercent}% vs prior 28 days`;
  return [
    "✅ Island Boy weekly analytics complete",
    "GBP 28-day performance",
    `Impressions: ${summary.impressions.current28Days} (${change})`,
    `Directions: ${summary.directionRequests} | Calls: ${summary.callClicks} | Website: ${summary.websiteClicks}`,
    `Menu clicks: ${summary.menuClicks} | Food orders: ${summary.foodOrders}`,
    `Tracked action rate: ${summary.actionRatePercent}%`,
    `Next focus: ${report.recommendations[0]}`
  ].join("\n");
}

function telegramConfig() {
  const allowed = process.env.TELEGRAM_ALLOWED_USERS || "";
  return {
    enabled: process.env.ISLAND_BOY_TELEGRAM_NOTIFY !== "0" && !args.has("--no-telegram"),
    token: process.env.ISLAND_BOY_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || "",
    chatId: process.env.ISLAND_BOY_TELEGRAM_CHAT_ID || process.env.TELEGRAM_HOME_CHANNEL || allowed.split(",").map((v) => v.trim()).find(Boolean) || "",
    threadId: process.env.ISLAND_BOY_TELEGRAM_THREAD_ID || process.env.TELEGRAM_HOME_CHANNEL_THREAD_ID || ""
  };
}

async function sendTelegram(text) {
  const { enabled, token, chatId, threadId } = telegramConfig();
  if (!enabled || !token || !chatId) return false;
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, ...(threadId ? { message_thread_id: Number(threadId) } : {}), text, disable_web_page_preview: true })
    });
    if (!response.ok) {
      console.warn(`Telegram notification failed non-blockingly: ${response.status}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn(`Telegram notification failed non-blockingly: ${error.message}`);
    return false;
  }
}

async function main() {
  if (args.has("--test-telegram")) {
    const sent = await sendTelegram("✅ Island Boy automation notifications are connected. Hermes will send a short result after reviews, GBP posts, analytics, and registration-email checks.");
    console.log(`Telegram test ${sent ? "sent" : "skipped because credentials are not configured"}.`);
    return;
  }
  if (args.has("--discover-locations")) {
    await discoverLocations();
    return;
  }

  const actionFlags = ["--audit-profile", "--apply-services", "--apply-hours", "--sync-food-menu", "--sync-reviews", "--reply-unanswered", "--maybe-post", "--sync-analytics", "--sync-search-console"];
  if (!actionFlags.some((flag) => args.has(flag))) args.add("--audit-profile");
  const results = {};
  if (args.has("--apply-services")) results.services = await applyServices();
  if (args.has("--apply-hours")) results.hours = await applyRegularHours();
  if (args.has("--sync-food-menu")) results.foodMenu = await syncFoodMenu();
  if (args.has("--audit-profile")) results.audit = await auditProfile();
  if (args.has("--sync-reviews") || args.has("--reply-unanswered")) {
    const previousData = readJson(reviewsPath, null);
    const data = await fetchReviews();
    const replies = args.has("--reply-unanswered") ? await replyToUnanswered(data) : { attempted: 0, published: 0 };
    const changed = writeJsonIfChanged(reviewsPath, data);
    recordReviewHistory(previousData, data);
    results.review = { status: "complete", changed, reviewCount: data.reviewCount, rating: data.rating, replies, unansweredRemaining: data.reviews.filter((review) => !review.reply).length };
    console.log(`Review sync complete: changed=${changed} reviewCount=${data.reviewCount} rating=${data.rating} replies=${replies.published}/${replies.attempted}`);
  }
  if (args.has("--maybe-post")) results.post = await maybePost();
  if (args.has("--sync-analytics")) results.analytics = await syncPerformanceAnalytics();
  if (args.has("--sync-search-console")) results.searchConsole = await syncSearchConsoleAnalytics();

  writeJsonIfChanged(digestPath, { business: businessName(), completedAt: new Date().toISOString(), ...results });
  if (results.review) await sendTelegram(["✅ Island Boy review job complete", `Reviews synced: ${results.review.reviewCount} (${results.review.rating}★)`, `New replies posted: ${results.review.replies.published}`, `Unanswered remaining: ${results.review.unansweredRemaining}`].join("\n"));
  if (results.post) await sendTelegram(["✅ Island Boy GBP post job complete", `Post: ${results.post.published ? "published" : results.post.attempted ? "dry run / not published" : "not due"}`, `Type: ${results.post.kind || results.post.reason || "n/a"}`].join("\n"));
  if (results.analytics) await sendTelegram(analyticsDigest(results.analytics));
  if (results.searchConsole) await sendTelegram(searchConsoleDigest(results.searchConsole));
  if (results.foodMenu) await sendTelegram(["✅ Island Boy GBP menu job complete", `Menu: ${results.foodMenu.dryRun ? "validated" : results.foodMenu.changed ? "updated" : "already current"}`, `Published items: ${results.foodMenu.publishedCount || results.foodMenu.itemCount}`].join("\n"));
  if (results.audit || results.services) await sendTelegram(["✅ Island Boy profile-health job complete", `Open audit findings: ${results.audit?.findings?.length ?? "not checked"}`, `Media on profile: ${results.audit?.media?.totalMediaItemCount ?? "not checked"}`, `Menu items: ${results.audit?.foodMenu?.itemCount ?? "not checked"}`, `Services: ${results.services ? `${results.services.applied ? "updated" : "validated"} (${results.services.count})` : "not requested"}`].join("\n"));
  if (results.hours) await sendTelegram(["✅ Island Boy GBP hours job complete", `Recurring truck hours: ${results.hours.applied ? "updated" : "validated"}`, `Published schedule periods: ${results.hours.periodCount}`].join("\n"));
}

main().catch(async (error) => {
  console.error(error.stack || error.message);
  try {
    await sendTelegram(`Business: ${businessName()}\nIsland Boy GBP automation failed: ${String(error.message || error).slice(0, 500)}`);
  } catch {}
  process.exitCode = 1;
});
