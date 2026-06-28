# Getting VintageFit on TestFlight

Everything except the final Xcode click-throughs has been prepared. The
steps below run on **your Mac** (not in this repo's CI) because TestFlight
requires Apple Developer credentials, Xcode, and code-signing certificates
that only live on your machine.

Total time the first time: ~20–30 minutes. Subsequent updates: 5 minutes.

## 0. Prerequisites (one-time)

- [ ] Apple ID enrolled in the [Apple Developer Program](https://developer.apple.com/programs/) ($99/yr). Personal Team is not enough for TestFlight — you need a paid membership.
- [ ] Xcode 15+ installed from the Mac App Store.
- [ ] `brew install xcodegen` — the project is generated from `project.yml`.

## 1. Generate and open the Xcode project

```sh
git clone https://github.com/manicmerlin/Miamidriver.git
cd Miamidriver/ios
xcodegen generate
open VintageFit.xcodeproj
```

The app already runs in **mock backend mode** by default — you can hit Cmd-R
in the simulator right now and try the full flow without standing up the
backend.

## 2. Set your team and bundle identifier

In Xcode:

1. Click the `VintageFit` project node in the navigator (top of the left pane).
2. Select the `VintageFit` target → **Signing & Capabilities** tab.
3. Check **Automatically manage signing**.
4. **Team:** pick your paid Developer Program team.
5. **Bundle Identifier:** Apple requires this to be globally unique. Change
   `app.vintagefit.ios` to something prefixed with your reverse-domain
   (e.g. `com.yourname.vintagefit`). The app will work with any string.

Xcode will create a matching App ID in your developer account automatically.

## 3. (Optional) Point at your deployed backend

If you've already deployed the backend (see `backend/README.md`):

- Run the app once, open **Settings** (gear icon), turn off **Use built-in mock backend**, and paste your backend URL (e.g. `https://vintagefit-backend.fly.dev`).
- Or change the default in `ios/VintageFit/Services/Settings.swift`.

You can ship to TestFlight in mock mode and switch later — the toggle is
in the app's settings.

## 4. Archive

In Xcode menu bar:

1. Change the run destination (top toolbar) to **Any iOS Device (arm64)** — not a simulator.
2. **Product → Archive**. Xcode builds, signs, and packages the .ipa. ~2 minutes.

If archive fails with signing errors, double-check Section 2: bundle ID is
unique, team is selected, "Automatically manage signing" is on.

## 5. Upload to App Store Connect

When the Organizer window appears (Xcode → Window → Organizer if it didn't):

1. Select your new archive.
2. **Distribute App** → **App Store Connect** → **Upload** → **Next** through the defaults → **Upload**.
3. Wait for Apple to process (~5–15 minutes). You'll get an email when it's ready.

## 6. Create the TestFlight build entry

In [App Store Connect](https://appstoreconnect.apple.com):

1. **My Apps** → **+** → **New App**.
2. Platforms: **iOS**, Name: **VintageFit** (or whatever), Primary Language, Bundle ID (pick the one you set in Section 2), SKU: anything unique.
3. After the app entry is created, go to the **TestFlight** tab.
4. Your uploaded build will appear after Apple's processing completes. Click it.
5. **Export Compliance:** select "Does your app use encryption?" → **No** (the Info.plist already declares `ITSAppUsesNonExemptEncryption = false`).
6. Fill in **Test Information** (required even for internal testers): support email + a one-line description ("Vintage clothing fit-finder, personal beta").

## 7. Add testers

**Internal Testers** (you + up to 99 people on your Apple Developer team):

1. TestFlight tab → **Internal Testing** → **+** → pick yourself.
2. No review needed — the build is immediately available.
3. Install **TestFlight** app on your iPhone, accept the invite email, hit Install.

**External Testers** (up to 10,000 people, anyone with an email):

1. TestFlight tab → **External Testing** → create a group → add testers.
2. Submit the build for **Beta App Review** (~24-hour Apple review).
3. After approval, testers get the invite.

For personal use, internal testing is what you want — instant, no review.

## 8. Subsequent builds

Each new build:

```sh
cd ios
# pull latest, regenerate project if .swift files were added
xcodegen generate
# In Xcode: bump the Build number under General → Identity, then:
# Product → Archive → Distribute → Upload
```

That's it. App Store Connect auto-promotes uploaded builds to your internal
testers.

## Troubleshooting

- **"Missing compliance" before testers can install** — you skipped Section 6
  step 5. Open the build → Export Compliance → answer No.
- **"Bundle ID already exists"** — someone else (or a past project of yours)
  registered it. Change the bundle ID in Section 2.
- **Archive grayed out** — destination is set to a simulator. Change to
  "Any iOS Device (arm64)".
- **Mock mode shows a Christian Dior Monsieur example for every input** — that's
  expected. Mock mode returns the same demo data regardless of input. Turn
  it off in Settings to call your real backend.
