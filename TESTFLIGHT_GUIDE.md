# Deploy MD Fitness to TestFlight

This guide walks you through building and submitting the MD Fitness app to Apple TestFlight for beta testing.

## Prerequisites

1. **Apple Developer Account** ($99/year)  
   Sign up at [developer.apple.com](https://developer.apple.com/account/)

2. **Expo account** (free)  
   Create one at [expo.dev](https://expo.dev) if needed

3. **App created in App Store Connect**  
   You’ll need this for `ascAppId` when submitting. Create it at [App Store Connect](https://appstoreconnect.apple.com):
   - Click **My Apps** → **+** → **New App**
   - Use Bundle ID: `com.mdfitness.mobile`
   - Note the **Apple ID** (numeric) — that’s your `ascAppId`

---

## Quick path (recommended)

Use the combined build and submit flow:

```bash
npx eas-cli build --platform ios --profile production --auto-submit
```

EAS will prompt for credentials and submission settings if needed.

---

## Step-by-step path

### 1. Install EAS CLI and log in

```bash
npm install -g eas-cli
eas login
```

### 2. Configure the project (if not done)

```bash
eas build:configure
```

### 3. Build for iOS (production)

```bash
eas build --platform ios --profile production
```

- First build: EAS will set up Apple credentials (distribution cert, provisioning profile).
- Builds run in the cloud; link to the build appears in the terminal.
- Wait until the build status is **Finished**.

### 4. Submit to TestFlight

**Option A – Submit right after build**

```bash
eas submit --platform ios --profile production --latest
```

**Option B – Auto-submit on next build**

```bash
eas build --platform ios --profile production --auto-submit
```

### 5. Set `ascAppId` in `eas.json` (for easier submits)

1. In [App Store Connect](https://appstoreconnect.apple.com) → **My Apps** → select your app
2. **App Information** → note the **Apple ID** (e.g. `1234567890`)
3. In `eas.json`, under `submit.production.ios`, set:

```json
"ascAppId": "1234567890"
```

Replace `YOUR_APP_STORE_CONNECT_APP_ID` with that value.

---

## After submission

- Processing usually takes 5–15 minutes.
- In App Store Connect → **TestFlight**, you’ll see the build when processing finishes.
- Add internal testers (up to 100, no review), or external testers (up to 10,000, needs brief review).
- Testers receive an invite and install the app via the TestFlight app.

---

## Notes

- **Supabase**: The app points to your Supabase project; no extra env changes needed for TestFlight.
- **Bundle ID**: `com.mdfitness.mobile` is set in `app.json`.
- **Build profiles** in `eas.json`:
  - `preview`: Internal testing
  - `production`: App Store / TestFlight submission

---

## Troubleshooting

| Issue | Action |
|-------|--------|
| "No valid code signing" | Run `eas credentials --platform ios` and configure production credentials |
| "App not found" on submit | Check `ascAppId` in `eas.json` and that the app exists in App Store Connect |
| Build fails | Inspect build logs in the EAS dashboard; common causes are missing native deps or credentials |
