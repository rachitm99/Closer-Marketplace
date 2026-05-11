#!/usr/bin/env node
/**
 * Setup script for Creator Marketplace API
 * Automatically generates and stores page token
 * Run once: node setup-creator-marketplace.js <user_access_token>
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const APP_ID = process.env.META_APP_ID || "992321946822610";
const APP_SECRET = process.env.META_APP_SECRET || "1f932de1009a5722aa8d4fda951e1a36";
const IG_USER_ID = process.env.META_IG_USER_ID || "17841454157652092";
const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v25.0";

const userAccessToken = process.argv[2];

if (!userAccessToken) {
  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║  Creator Marketplace Setup                                         ║
╚════════════════════════════════════════════════════════════════════╝

This script will automatically generate your Page Access Token.

🔑 To get a User Access Token:
   1. Visit: https://developers.facebook.com/tools/explorer/
   2. Select your app: "closer-marketplace"
   3. Click "Get Token" → "Get User Access Token"
   4. Enable these permissions:
      ✓ instagram_creator_marketplace_discovery
      ✓ instagram_basic
      ✓ pages_read_engagement
   5. Generate token and copy it

📋 Then run: node setup-creator-marketplace.js "<paste_token_here>"
  `);
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
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    }).on("error", reject);
  });
}

async function setup() {
  try {
    console.log("🔄 Validating user token...\n");

    const meUrl = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/me`);
    meUrl.searchParams.set("access_token", userAccessToken);
    meUrl.searchParams.set("fields", "id,name");

    const meResponse = await makeRequest(meUrl.toString());

    if (meResponse.status !== 200 || meResponse.data.error) {
      console.error("❌ Invalid token:", meResponse.data.error?.message || "Unknown error");
      process.exit(1);
    }

    console.log(`✅ Valid token for user: ${meResponse.data.name}\n`);

    console.log("📋 Fetching your pages...\n");

    const accountsUrl = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/me/accounts`);
    accountsUrl.searchParams.set("fields", "id,name,access_token,instagram_business_account{id}");
    accountsUrl.searchParams.set("limit", "100");
    accountsUrl.searchParams.set("access_token", userAccessToken);

    const accountsResponse = await makeRequest(accountsUrl.toString());

    if (accountsResponse.status !== 200 || accountsResponse.data.error) {
      console.error("❌ Failed to fetch pages:", accountsResponse.data.error?.message);
      process.exit(1);
    }

    const pages = accountsResponse.data.data || [];

    if (!pages.length) {
      console.error("❌ No pages found");
      console.error("\n⚠️  Make sure your user token has 'pages_read_engagement' permission");
      process.exit(1);
    }

    console.log(`Found ${pages.length} page(s):\n`);
    pages.forEach((page, i) => {
      const igId = page.instagram_business_account?.id;
      const status = igId === IG_USER_ID ? " ✓ MATCH" : "";
      console.log(`   ${i + 1}. ${page.name}`);
      console.log(`      Page ID: ${page.id}`);
      console.log(`      IG ID:   ${igId || "(not linked)"}${status}\n`);
    });

    const targetPage = pages.find(
      (page) => page.instagram_business_account?.id === IG_USER_ID
    );

    if (!targetPage) {
      console.error(`❌ No page found linked to IG User ID: ${IG_USER_ID}`);
      console.error(
        "\n💡 Tips:\n" +
          "   • Verify your Instagram Business Account is linked to a Facebook Page\n" +
          "   • Check that META_IG_USER_ID in .env.local matches your IG Business Account ID\n" +
          "   • You can find your IG ID at: https://www.instagram.com/accounts/login/\n"
      );
      process.exit(1);
    }

    const pageToken = targetPage.access_token;

    // Update .env.local
    const envPath = path.join(__dirname, ".env.local");
    let envContent = fs.readFileSync(envPath, "utf-8");

    if (envContent.includes("META_PAGE_ACCESS_TOKEN")) {
      envContent = envContent.replace(
        /META_PAGE_ACCESS_TOKEN=.*/,
        `META_PAGE_ACCESS_TOKEN=${pageToken}`
      );
    } else {
      envContent += `\nMETA_PAGE_ACCESS_TOKEN=${pageToken}\n`;
    }

    fs.writeFileSync(envPath, envContent);

    console.log(`✅ Saved page token for: ${targetPage.name}\n`);
    console.log("✨ Setup complete! Your app is ready to search external creators.\n");
    console.log("📝 Next steps:");
    console.log("   1. Restart your dev server (npm run dev)");
    console.log("   2. Search for creators: curl 'http://localhost:3000/api/creator-marketplace?username=dr_nishaa'\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

setup();
