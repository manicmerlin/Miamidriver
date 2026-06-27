# VintageFit — fit-profile extractor + per-marketplace search-term generator

You buy a vintage piece off Depop or eBay and it fits perfectly. You want to
find more like it — same brand, same line, same era, same dimensions — across
Depop, eBay, Mercari, Poshmark, Grailed. This is the infrastructure that
makes that possible.

> **Status:** v0 — extraction + search-term generation. No automated cross-site
> search yet (per product decision). You get copy-pasteable queries to run
> yourself on each marketplace.

## Shape

```
┌────────────────────────┐    POST /v1/ingest    ┌────────────────────────────┐
│ iOS client (SwiftUI)   │ ───────────────────▶  │ FastAPI backend            │
│  · URL paste           │                       │  · URL → SourceGarment     │
│  · Tag photo (camera)  │                       │  · Tag photo → SourceGarment│
└────────────────────────┘                       │  · Brand KB lookup         │
            ▲                                    │  · FitProfile assembler    │
            │  IngestResponse                    │  · Search-term generator   │
            └────────────────────────────────────└────────────────────────────┘
```

### What v0 does
- Accepts a marketplace URL (Depop, eBay, Mercari, Poshmark, Grailed) or a
  tag photo
- Extracts brand, line/sub-line, era, garment type, size, country of origin,
  fabric content, and seller-stated measurements
- Looks up the brand in a curated knowledge base to resolve era from
  country-of-origin / tag markers
- Generates 2–5 copy-pasteable search queries per marketplace, ranked
  targeted → broad, plus deep-link URLs that pre-fill the top query

### What v0 explicitly does NOT do
- Run scrapers across Depop / Mercari / Poshmark / Grailed (planned for v1)
- CV-derived measurements from photos (planned for v1 — the schema already
  supports `cv-estimate` source measurements)
- Save profiles or push-notify on new matches (planned for v1)

## Repo layout
```
backend/      Python FastAPI service. See backend/README.md.
ios/          SwiftUI iOS client skeleton. See ios/README.md.
```

## Quick start

### Backend
```sh
cd backend
python -m venv .venv
.venv/bin/pip install -e ".[dev]"
.venv/bin/pytest -q              # run tests
.venv/bin/uvicorn app.main:app --reload
# Now POST a URL:
curl -X POST http://localhost:8000/v1/ingest -F "url=https://www.depop.com/products/<id>"
```

For tag-image OCR, copy `.env.example` to `.env` and set:
```
VISION_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-...
```
With `VISION_PROVIDER=stub` (default) image uploads succeed but return empty
fields — useful for end-to-end testing without an API key.

### iOS
```sh
brew install xcodegen
cd ios && xcodegen generate && open VintageFit.xcodeproj
```

## Adding a brand to the knowledge base

Drop a YAML file in `backend/app/brands/data/`. Mirror the shape of
`j_crew.yaml` or `christian_dior_monsieur.yaml`. Restart the server (the KB
is lru-cached at module load).

## Roadmap

- **v0.1** — More brand records (Polo Country, Banana Republic Safari & Travel,
  Lacoste devanlay-era, Stüssy original SS) and tighter measurement regexes
- **v0.2** — eBay Browse API integration (the only marketplace with a usable
  public API) → real cross-site results, not just suggested queries
- **v0.3** — CV measurement extraction from flat-lay photos (segmentation +
  scale calibration from a known reference like a hanger)
- **v0.4** — Saved profiles, push notifications on new matches
- **v1.0** — Maintained scrapers for Depop/Mercari/Poshmark/Grailed (proxy
  rotation, anti-bot survival) — the operationally expensive part
