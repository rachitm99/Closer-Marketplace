# Creator Marketplace Setup Guide

## 🎯 Production-Ready: Fully Automatic Token Management

This app now uses **automatic token generation and refresh** during OAuth login. No manual setup required!

### How It Works

1. **User logs in** via Facebook → `/login` 
2. **App captures** their access token
3. **Page token auto-generated** and stored securely in encrypted session
4. **Page token auto-refreshes** before expiry (7-day buffer)
5. **Zero maintenance** - everything happens automatically

---

## Quick Start: 3 Steps

### Step 1: Ensure Environment is Configured

Copy template and fill in your Meta app credentials:

```bash
cp .env.local.example .env.local
```

Required in `.env.local`:
- `META_APP_ID` - Your Meta app ID
- `META_APP_SECRET` - Your Meta app secret
- `META_IG_USER_ID` - Your Instagram Business Account ID
- `SESSION_SECRET` - Random 32+ character string
- `META_PAGE_ID` - Your Facebook Page ID (optional if only one page)

### Step 2: Generate SESSION_SECRET (if needed)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy output to `.env.local` as `SESSION_SECRET`.

### Step 3: Start App & Login

```bash
npm run dev
```

Then visit: http://localhost:3000/login

- Click **"Login with Facebook"**
- Authorize requested permissions
- App auto-generates page token
- Redirect to dashboard

---

## That's It! 🎉

Your app now has:
✅ **Active user session**  
✅ **Auto-generated page token**  
✅ **Auto-refresh before expiry**  
✅ **Permission to search any creator** (like "dr_nishaa")

---

## Testing

Once logged in, search external creators:

```bash
curl "http://localhost:3000/api/creator-marketplace?username=dr_nishaa" \
  -H "Cookie: $(curl -s http://localhost:3000/login -c - | grep cm_auth_session | awk '{print $NF}')"
```

Or via the web dashboard (coming soon).

---

## Production Deployment

### Key Features for Production:

1. **Secure Token Storage**
   - User tokens stored in encrypted httpOnly cookies
   - Page tokens stored in session alongside user token
   - Tokens auto-refresh before expiry

2. **Auto-Refresh System**
   - User token: Refreshes 7 days before expiry
   - Page token: Refreshes 7 days before expiry
   - Automatic during API calls, no user action needed

3. **Fallback Logic**
   - If page token refresh fails, uses cached token
   - If session expires, user logs in again
   - Graceful error handling with clear instructions

4. **No Manual Intervention**
   - After 60 days, page token auto-refreshes
   - After 60 days, user token auto-refreshes
   - Everything happens in background

---

## Alternative: Manual Setup (Development Only)

If you want to set up a page token without OAuth login:

```bash
npm run setup "your_user_access_token"
```

To get a user token:
1. https://developers.facebook.com/tools/explorer/
2. Select your app
3. "Get Token" → "Get User Access Token"
4. Add: `instagram_creator_marketplace_discovery`, `instagram_basic`, `pages_read_engagement`
5. Generate token and copy
6. Run: `npm run setup "token_here"`

---

## Troubleshooting

### ❌ "Authentication required to search external creators"

**Solution:** Sign in with Facebook first at `/login`

### ❌ "Failed to auto-generate page token"

**Causes:**
- User doesn't have permission to access pages
- Meta app not in Live mode
- Insufficient permissions granted

**Fix:** Verify permissions in Meta app settings, ensure Live mode, try logging in again

### ❌ Getting mock profiles (usernames start with `mocked_`)

**Solution:** Verify Meta app is in **Live Mode**, not Sandbox
- Meta app dashboard → Settings → Basic → Check "App Mode"
- Should be "Live" (production) not "Development"

### ❌ "No page found linked to IG User ID"

**Solution:** Verify configuration:
1. Check `.env.local` has correct `META_IG_USER_ID`
2. Verify page is linked to IG Business Account
3. User has admin access to both

---

## File Reference

- `.env.local` - Your credentials (gitignore'd)
- `.env.local.example` - Configuration template
- `src/app/api/auth/facebook/callback/route.ts` - Auto-generates page token on login
- `src/lib/auth-session.ts` - Encrypted session storage (includes page token)
- `src/lib/meta-page-token.ts` - Token generation & refresh logic
- `src/app/api/creator-marketplace/route.ts` - Uses auto-refreshing page token

---

## Summary

✨ **This app is fully production-ready:**
- ✅ Zero manual token setup
- ✅ Automatic page token generation on login
- ✅ Automatic page token refresh before expiry
- ✅ Secure encrypted storage
- ✅ Search any public Instagram creator
- ✅ No intervention for 60+ days

