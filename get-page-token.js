#!/usr/bin/env node
/**
 * Utility to get a Page Access Token for Creator Marketplace API
 * 
 * Usage: node get-page-token.js <user_access_token>
 * 
 * To get a user access token:
 * 1. Go to https://developers.facebook.com/tools/explorer/
 * 2. Select your app in the dropdown
 * 3. Click "Get Token" > "Get User Access Token"
 * 4. Add these permissions: instagram_creator_marketplace_discovery, instagram_basic, pages_read_engagement
 * 5. Click "Generate Access Token"
 * 6. Copy the token and paste it as the argument to this script
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const APP_ID = process.env.META_APP_ID || "992321946822610";
const APP_SECRET = process.env.META_APP_SECRET || "1f932de1009a5722aa8d4fda951e1a36";
const IG_USER_ID = process.env.META_IG_USER_ID || "17841454157652092";
const PAGE_ID = process.env.META_PAGE_ID || "103556415743539";
const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v25.0";

const userAccessToken = process.argv[2];

if (!userAccessToken) {
  console.error("❌ Error: User access token required as first argument");
  console.error("");
  console.error("Usage: node get-page-token.js <user_access_token>");
  console.error("");
  console.error("To get a user access token:");
  console.error("1. Go to https://developers.facebook.com/tools/explorer/");
  console.error("2. Select your app in the dropdown");
  console.error("3. Click 'Get Token' > 'Get User Access Token'");
  console.error("4. Add these permissions:");
  console.error("   - instagram_creator_marketplace_discovery");
  console.error("   - instagram_basic");
  console.error("   - pages_read_engagement");
  console.error("5. Click 'Generate Access Token'");
  console.error("6. Copy the token and run: node get-page-token.js <token>");
  process.exit(1);
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    }).on("error", reject);
  });
}

async function getPageToken() {
  console.log("📋 Fetching pages from /me/accounts...");

  const accountsUrl = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/me/accounts`);
  accountsUrl.searchParams.set("fields", "id,name,access_token,instagram_business_account{id}");
  accountsUrl.searchParams.set("limit", "100");
  accountsUrl.searchParams.set("access_token", userAccessToken);

  try {
    const accountsResponse = await makeRequest(accountsUrl.toString());

    if (accountsResponse.status !== 200 || accountsResponse.data.error) {
      console.error("❌ Error fetching accounts:", accountsResponse.data.error || accountsResponse.data);
      process.exit(1);
    }

    const pages = accountsResponse.data.data || [];

    if (!pages.length) {
      console.error("❌ No pages found for this user token");
      console.error("Make sure your user token has pages_read_engagement permission");
      process.exit(1);
    }

    console.log(`✅ Found ${pages.length} page(s):`);
    pages.forEach((page, i) => {
      const igId = page.instagram_business_account?.id || "(not linked)";
      console.log(`   ${i + 1}. ${page.name} (Page ID: ${page.id}, IG ID: ${igId})`);
    });

    // Try to find the page linked to our IG_USER_ID
    const targetPage = pages.find(
      (page) => page.instagram_business_account?.id === IG_USER_ID
    );

    if (!targetPage) {
      console.error(`\n❌ Could not find a page linked to IG User ID: ${IG_USER_ID}`);
      console.error(
        `\nPlease ensure:\n1. Your Instagram Business Account is linked to one of the pages above\n2. META_IG_USER_ID in .env.local matches your actual IG Business Account ID`
      );
      process.exit(1);
    }

    const pageToken = targetPage.access_token;

    console.log(`\n✅ Found matching page: ${targetPage.name}`);
    console.log(`\n📌 PAGE ACCESS TOKEN:`);
    console.log(`${pageToken}`);
    console.log(`\n📝 Add this to your .env.local:`);
    console.log(`META_PAGE_ACCESS_TOKEN=${pageToken}`);

    // Optionally update .env.local
    const envPath = path.join(__dirname, ".env.local");
    const envContent = fs.readFileSync(envPath, "utf-8");

    if (envContent.includes("META_PAGE_ACCESS_TOKEN")) {
      const updated = envContent.replace(
        /META_PAGE_ACCESS_TOKEN=.*/,
        `META_PAGE_ACCESS_TOKEN=${pageToken}`
      );
      fs.writeFileSync(envPath, updated);
      console.log(`\n✅ Updated .env.local with new page token`);
    } else {
      fs.appendFileSync(envPath, `\nMETA_PAGE_ACCESS_TOKEN=${pageToken}\n`);
      console.log(`\n✅ Added META_PAGE_ACCESS_TOKEN to .env.local`);
    }

    console.log("\n🚀 Restart your dev server and try again!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

getPageToken();
