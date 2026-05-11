#!/usr/bin/env node
/**
 * Check Creator Marketplace setup status
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

console.log("\n📊 Creator Marketplace Setup Status\n");

console.log("Required Configuration:");
console.log(`  ${appId ? "✅" : "❌"} META_APP_ID ${appId ? `(${appId.slice(0, 8)}...)` : ""}`);
console.log(`  ${appSecret ? "✅" : "❌"} META_APP_SECRET`);
console.log(`  ${igUserId ? "✅" : "❌"} META_IG_USER_ID ${igUserId ? `(${igUserId})` : ""}`);
console.log(`  ${sessionSecret ? "✅" : "❌"} SESSION_SECRET`);

console.log("\nPage Token (for external creator search):");
console.log(`  ${pageToken ? "✅" : "❌"} META_PAGE_ACCESS_TOKEN ${pageToken ? `(${pageToken.slice(0, 8)}...)` : ""}`);

console.log("\nOptional:");
console.log(`  ${pageId ? "✅" : "⚪"} META_PAGE_ID ${pageId ? `(${pageId})` : "(not set)"}`);

if (!pageToken) {
  console.log("\n⚠️  Page token not set. To search external creators:");
  console.log("   1. npm run setup <user_token>");
  console.log("   2. See SETUP.md for instructions\n");
}

if (appId && appSecret && igUserId && sessionSecret && pageToken) {
  console.log("\n✨ Setup complete! You can now:");
  console.log("   • Search external creators");
  console.log("   • Use Facebook login");
  console.log("   • Fetch creator insights\n");
}
