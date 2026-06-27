# VintageFit iOS (skeleton)

SwiftUI client for the VintageFit backend. v0 surface:

- **CaptureView** — paste a marketplace URL, or pick a tag photo
- **ResultView** — show extracted fit profile (brand, line, era, size, measurements)
- **SearchTermsView** — copy-pasteable search queries per marketplace, with deep-links

## Generate the Xcode project

```sh
brew install xcodegen
cd ios
xcodegen generate
open VintageFit.xcodeproj
```

## Point at the backend

Default is `http://localhost:8000`. Change it in `VintageFit/App.swift`. For
device testing, use your Mac's LAN IP (run `ifconfig | grep "inet 192"`)
and add an `NSAppTransportSecurity` exception in `project.yml` if your
backend isn't on HTTPS yet.

## Backend contract

The app calls `POST /v1/ingest` as `multipart/form-data` with either:
- `url` — a marketplace URL (text field)
- `image` — a tag photo (file)
- `notes` — optional free-text the user added

Response is `IngestResponse` — see `backend/app/schemas.py` for the source of truth.
