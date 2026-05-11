# Closer Creator Dashboard

Next.js dashboard that uses Facebook Login + Instagram Creator Marketplace API.


## 🚀 Production-Ready Features

- ✅ **Automatic token generation** - Page token auto-generated on user login
- ✅ **Auto-refresh system** - Tokens refresh 7 days before expiry
- ✅ **Zero manual setup** - No manual token management needed
- ✅ **Search external creators** - Find any public Instagram creator (e.g., "dr_nishaa")
- ✅ **Secure session storage** - Encrypted httpOnly cookies
- ✅ **Graceful fallbacks** - Clear error messages with next steps

## Quick Start

```bash
# 1. Setup environment
cp .env.local.example .env.local
# Fill in META_APP_ID, META_APP_SECRET, META_IG_USER_ID, SESSION_SECRET

# 2. Start dev server
npm run dev

# 3. Login with Facebook at http://localhost:3000/login

# 4. Search creators
curl "http://localhost:3000/api/creator-marketplace?username=dr_nishaa"
```

See [SETUP.md](./SETUP.md) for detailed setup instructions.
## What is implemented

- Facebook Login for user-scoped API access
- Secure server-side token session storage (encrypted, httpOnly cookie)
- Automatic long-lived user-token refresh before expiry
- Runtime page-token derivation from `/me/accounts`
- Two-step Creator Marketplace flow:
	1. Discover creator by username
	2. Fetch insights/media using discovered creator ID
- Raw payload capture for Creator Marketplace calls (discovery, username insights, creator_ids insights)
- Creator ID and insights displayed in table format

## Environment

Copy `.env.local.example` to `.env.local` and set:

- `META_APP_ID`
- `META_APP_SECRET`
- `SESSION_SECRET` (32+ chars)
- `META_IG_USER_ID`

**For searching external creators, you need:**

- `META_PAGE_ACCESS_TOKEN` - Generate automatically with: `npm run setup "user_token"`
  - See [SETUP.md](./SETUP.md) for detailed instructions

Optional:

- `META_PAGE_ID` (if user has multiple pages and you want to force one)
- `META_GRAPH_API_VERSION` (defaults to `v25.0`)
- `SAVE_CREATOR_MARKETPLACE_RAW` (defaults to `true`; set `false` to disable raw snapshots)
- `CREATOR_MARKETPLACE_RAW_DIR` (optional output directory for raw snapshots)

Raw snapshots are written to `.meta-debug/creator-marketplace` by default.

## Creator Marketplace raw response capture

`GET /api/creator-marketplace` now captures and returns raw responses for:

- Discovery API call (`discovery`)
- Creator Insights API call by username (`insights_by_username`)
- Creator Insights API call by creator IDs (`insights_by_creator_ids`)

The API response includes:

- `rawApiResponses` (redacted URL + status + payload for each call)
- `rawCapturePath` (path to saved JSON snapshot when write succeeds)

Sensitive query fields (`access_token`, `appsecret_proof`) are redacted in captured URLs.

## Local run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, click **Login with Facebook**, approve requested scopes, then run creator lookups.

## Production notes

- In **Development mode**, only app-role users can authorize.
- In **Live mode**, normal users can authorize after App Review/advanced access for required permissions.
- Tokens are never exposed to browser JS.
- If Meta revokes access (password reset/revoke/security), user must log in again.

## Required permissions

- `pages_show_list`
- `business_management`
- `instagram_basic`
- `pages_manage_metadata`
- `instagram_creator_marketplace_discovery`
- `public_profile`

## Security

- Rotate any secrets/tokens that were previously shared in logs/chats.
- Keep `.env.local` out of source control.
