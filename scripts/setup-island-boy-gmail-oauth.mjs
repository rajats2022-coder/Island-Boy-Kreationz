#!/usr/bin/env node

import { createServer } from "node:http";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "");
const envPath = join(root, ".env.local");
const clientFilePath = process.env.ISLAND_BOY_GMAIL_OAUTH_CLIENT_FILE
  || join(root, ".secrets", "island-boy-gmail-oauth-client.json");
const redirectUri = "http://127.0.0.1:8787/oauth2callback";
const scopes = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose"
];

loadDotEnv(envPath);
loadDotEnv(process.env.ISLAND_BOY_SHARED_GOOGLE_ENV_PATH || "");

function gmailClientCredentials() {
  if (existsSync(clientFilePath)) {
    const payload = JSON.parse(readFileSync(clientFilePath, "utf8"));
    const client = payload.web || payload.installed || {};
    if (!client.client_id || !client.client_secret) {
      throw new Error(`Gmail OAuth client file is missing client_id or client_secret: ${clientFilePath}`);
    }
    return { clientId: client.client_id, clientSecret: client.client_secret };
  }
  return {
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || ""
  };
}

function loadDotEnv(path) {
  if (!path || !existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

function upsertEnv(path, updates) {
  const current = existsSync(path) ? readFileSync(path, "utf8") : "";
  const lines = current.split(/\r?\n/);
  const seen = new Set();
  const next = lines.map((line) => {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
    if (!match || !(match[1] in updates)) return line;
    seen.add(match[1]);
    return `${match[1]}=${updates[match[1]]}`;
  });
  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) next.push(`${key}=${value}`);
  }
  writeFileSync(path, `${next.filter((line, index) => line || index < next.length - 1).join("\n")}\n`);
}

async function refreshAccessToken() {
  const { clientId, clientSecret } = gmailClientCredentials();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: process.env.ISLAND_BOY_GMAIL_REFRESH_TOKEN || "",
    grant_type: "refresh_token"
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`Gmail OAuth refresh failed: ${response.status} ${JSON.stringify(payload)}`);
  return payload.access_token;
}

async function check() {
  if (!process.env.ISLAND_BOY_GMAIL_REFRESH_TOKEN) {
    console.log("NOT_AUTHENTICATED: ISLAND_BOY_GMAIL_REFRESH_TOKEN is not set.");
    process.exitCode = 1;
    return;
  }
  const token = await refreshAccessToken();
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${token}` }
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`Gmail profile check failed: ${response.status} ${JSON.stringify(payload)}`);
  console.log(`AUTHENTICATED: ${payload.emailAddress}`);
}

async function exchangeCode(code) {
  const { clientId, clientSecret } = gmailClientCredentials();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code"
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`Google OAuth token exchange failed: ${response.status} ${JSON.stringify(payload)}`);
  return payload;
}

async function main() {
  if (process.argv.includes("--check")) {
    await check();
    return;
  }
  const { clientId } = gmailClientCredentials();
  if (!clientId) {
    throw new Error("Google OAuth client credentials were not found.");
  }

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes.join(" "));
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("login_hint", process.env.ISLAND_BOY_GMAIL_EMAIL || "deonhenry756@gmail.com");

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, redirectUri);
      if (url.pathname !== "/oauth2callback") {
        response.writeHead(404);
        response.end("Not found");
        return;
      }
      const code = url.searchParams.get("code");
      if (!code) throw new Error(url.searchParams.get("error") || "Missing OAuth code");
      const token = await exchangeCode(code);
      if (!token.refresh_token) throw new Error("Google did not return a refresh token. Revoke the old grant and retry the consent flow.");
      upsertEnv(envPath, {
        ISLAND_BOY_GMAIL_EMAIL: process.env.ISLAND_BOY_GMAIL_EMAIL || "deonhenry756@gmail.com",
        ISLAND_BOY_GMAIL_REFRESH_TOKEN: token.refresh_token
      });
      response.writeHead(200, { "content-type": "text/plain" });
      response.end("Island Boy Gmail automation is connected. You can close this tab.");
      console.log("Gmail OAuth refresh token saved to .env.local.");
      server.close();
    } catch (error) {
      response.writeHead(500, { "content-type": "text/plain" });
      response.end(error.message);
      console.error(error.message);
      server.close();
      process.exitCode = 1;
    }
  });

  server.listen(8787, "127.0.0.1", () => {
    console.log(`Opening Gmail OAuth for ${process.env.ISLAND_BOY_GMAIL_EMAIL || "deonhenry756@gmail.com"}.`);
    execFileSync("open", [authUrl.toString()]);
  });
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
