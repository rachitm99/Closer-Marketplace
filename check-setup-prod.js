#!/usr/bin/env node
/**
 * Check Creator Marketplace setup status (Production-Ready)
 * 
 * This checks the core configuration needed for automatic token generation on login.
 * Page tokens are now auto-generated during Facebook OAuth login, not stored in .env.local.
 */

const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, ".env.local");

if (!fs.existsSync(envPath)) {
  console.error("❌ .env.local not found. Create it with: cp .env.local.example .env.local");
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, "utf-8");
const lines = envContent.split("\n");

const getEnv = (key) => {
  const line = lines.find((l) => l.startsWith(`${key}=`));
  return line?.split("=")[1]?.trim() || null;
};

const appId = getEnv("META_APP_ID");
const appSecret = getEnv("META_APP_SECRET");
const igUserId = getEnv("META_IG_USER_ID");
const pageId = getEnv("META_PAGE_ID");
const pageToken = getEnv("META_PAGE_ACCESS_TOKEN");
const sessionSecret = getEnv("SESSION_SECRET");

console.log("\n🚀 Creator Marketplace (Production-Ready)\n");

console.log("Core Configuration:");
console.log(`  ${appId ? "✅" : "❌"} META_APP_ID ${appId ? `(${appId.slice(0, 8)}...)` : ""}`);
console.log(`  ${appSecret ? "✅" : "❌"} META_APP_SECRET`);
console.log(`  ${igUserId ? "✅" : "❌"} META_IG_USER_ID ${igUserId ? `(${igUserId})` : ""}`);
console.log(`  ${sessionSecret ? "✅" : "❌"} SESSION_SECRET`);

console.log("\nOptional / Development:");
console.log(`  ${pageId ? "✅" : "⚪"} META_PAGE_ID ${pageId ? `(${pageId})` : "(not set)"}`);
console.log(`  ${pageToken ? "✅" : "⚪"} META_PAGE_ACCESS_TOKEN ${pageToken ? `(${pageToken.slice(0, 8)}... dev mode)` : "(auto-generated on login)"}`);

const coreReady = appId && appSecret && igUserId && sessionSecret;

if (coreReady) {
  console.log("\n✨ Production Mode: Ready for deployment!\n");
  console.log("📌 How it works:");
  console.log("   1. User visits /login");
  console.log("   2. Logs in with Facebook");
  console.log("   3. App auto-generates page token");
  console.log("   4. Page token auto-refreshes every 60 days");
  console.log("   5. Zero manual maintenance\n");
  console.log("🚀 To start:");
  console.log("   npm run dev");
  console.log("   Visit http://localhost:3000/login\n");
} else {
  console.log("\n❌ Missing required configuration in .env.local:");
  if (!appId) console.log("   • META_APP_ID");
  if (!appSecret) console.log("   • META_APP_SECRET");
  if (!igUserId) console.log("   • META_IG_USER_ID");
  if (!sessionSecret) console.log("   • SESSION_SECRET");
  console.log("\n   See .env.local.example for template\n");
}
