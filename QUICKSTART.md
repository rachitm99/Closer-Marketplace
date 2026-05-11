# ⚡ Quick Start: Production-Ready Creator Marketplace

## 🎯 One-Time Setup

```bash
# 1. Configure environment
cp .env.local.example .env.local
# Edit .env.local and fill in:
#   - META_APP_ID
#   - META_APP_SECRET
#   - META_IG_USER_ID
#   - SESSION_SECRET (generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
#   - META_PAGE_ID

# 2. Verify setup
npm run check

# 3. Start dev server
npm run dev
```

## 🚀 Using the App

```bash
# 1. Open http://localhost:3000/login
# 2. Click "Login with Facebook"
# 3. Authorize permissions
# 4. App auto-generates page token
# 5. You can now search creators!
```

## 🔍 Search External Creators

Once logged in, use the API:

```bash
# Search by username
curl "http://localhost:3000/api/creator-marketplace?username=dr_nishaa"

# With creator insights
curl "http://localhost:3000/api/creator-marketplace?username=dr_nishaa&include_insights=true"

# With media data
curl "http://localhost:3000/api/creator-marketplace?username=dr_nishaa&include_media=true"

# Search by query
curl "http://localhost:3000/api/creator-marketplace?query=beauty+influencers&limit=20"
```

## 📌 Key Points

- ✅ **Page token auto-generated** when user logs in
- ✅ **Page token auto-refreshes** before expiry (7-day buffer)
- ✅ **Zero manual intervention** - everything automatic
- ✅ **After 60 days** - token auto-refreshes, no downtime
- ✅ **Search any public creator** - no brand restrictions

## 🔧 Development Only

If you want to test without OAuth:

```bash
# Get user token from:
# https://developers.facebook.com/tools/explorer/
# - Select your app
# - Get User Access Token
# - Add: instagram_creator_marketplace_discovery, instagram_basic, pages_read_engagement

# Generate page token
npm run setup "your_user_token_here"

# Check status
npm run check  # Should show page token now
```

## 📦 Production Deployment

```bash
# Build
npm run build

# Deploy using your platform (Vercel, AWS, etc.)
# No manual setup needed - users login and get auto-generated tokens

# Environment variables needed:
# - META_APP_ID
# - META_APP_SECRET
# - SESSION_SECRET
# - META_IG_USER_ID
# - META_PAGE_ID
```

## ❓ Common Issues

| Problem | Solution |
|---------|----------|
| "Authentication required" | Login at `/login` first |
| Mock profiles (mocked_*) | Verify app in Live mode (not Sandbox) |
| Can't find creator | Verify creator is public on Instagram |
| Token refresh issues | Check SESSION_SECRET is 32+ chars |

## 📚 Documentation

- **[SETUP.md](./SETUP.md)** - Detailed setup guide
- **[PRODUCTION_READY.md](./PRODUCTION_READY.md)** - Production deployment
- **[SOLUTION_SUMMARY.md](./SOLUTION_SUMMARY.md)** - Implementation details

## 💡 Remember

- **No manual setup after 60 days** ✨
- **Page tokens auto-refresh automatically** ✨
- **User tokens auto-refresh automatically** ✨
- **Search any public Instagram creator** ✨
- **Zero operational overhead** ✨

Happy creator searching! 🚀
