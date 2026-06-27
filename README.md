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
- Extracts brand, line/sub-line, garment type, size, country of origin,
  fabric content, and seller-stated measurements
- **Infers era from tag markers + listing photos + brand KB** — combines
  country-of-origin tag markers with vision-model observations (collar style,
  fabric pattern, label aging) and ranks era candidates by signal weight
- **Looks up canonical measurements** with honest provenance tiers:
  - `researched` — backed by cited sources (brand archive, sampled listings,
    sizing-comparison sites). Citations surfaced in the response and shown
    in the iOS UI.
  - `estimated` — my best-guess baseline. UI badges them ORANGE so the user
    knows.
- **Optionally researches live** when the curated KB has no `researched`
  entry — calls Anthropic's `web_search` tool to pull canonical
  measurements + citations on demand. Off by default; enable with
  `RESEARCH_PROVIDER=anthropic` plus an `ANTHROPIC_API_KEY`.
- **Cross-matches against other vintage collections** — finds other (brand,
  line, era, size) combos whose canonical measurements are within tolerance,
  so a Christian Dior Monsieur Bohan-era L can surface a J.Crew Slim Untucked
  L or a Polo Ralph Lauren Custom Fit M that should fit similarly
- Generates 2–5 copy-pasteable search queries per marketplace for the source
  garment AND for each cross-match candidate, plus deep-link URLs

### What v0 explicitly does NOT do
- Run scrapers across Depop / Mercari / Poshmark / Grailed (planned for v1)
- CV-derived measurements from photos (planned for v1 — the schema already
  supports `cv-estimate` source measurements)
- Save profiles or push-notify on new matches (planned for v1)
- Curated sizing for every brand on earth — the cross-match engine is only
  as good as the YAMLs in `backend/app/sizing/data/`. Adding one is a
  one-file PR.

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

## Sizing data — measurement convention and provenance

**Convention.** Every measurement in the sizing KB and every value the
backend hands back is **pit-to-pit (half-chest), garment flat, in inches**.
Brand size charts often publish *full chest circumference* — those values
are divided by 2 before they enter the KB.

**Provenance is part of the data.** Each `SizeChartEntry` carries a `tier`:

| Tier | Meaning | UI |
|---|---|---|
| `researched` | Backed by cited sources in `citations`. Real numbers. | Green badge |
| `estimated` | My best-guess baseline. Use with caution. | Orange badge |
| `user_contributed` | A measurement the user added themselves. | Blue badge |

The first researched entry in the seed KB is the Christian Dior Monsieur
Bohan-era long-sleeve sport shirt — cited against Grailed listings that
quote pit-to-pit measurements directly. Everything else is honestly tagged
`estimated` until researched.

## Adding a brand to the knowledge bases

Two YAMLs power the system:

1. **Brand KB** — `backend/app/brands/data/<brand>.yaml`
   - `eras` with `tag_markers` (country of origin, label script, etc.) drive
     era inference. Adding an era automatically expands what the resolver
     can pick.
2. **Sizing KB** — `backend/app/sizing/data/<brand>.yaml`
   - One file can hold multiple `charts` (one per line × era × garment type)
   - Each chart maps size → {chest, length, shoulder, sleeve, …} in inches
     (pit-to-pit / half-chest)
   - `tier`, `citations`, and `source` carry the provenance — the iOS UI
     surfaces all three

The cross-match engine considers any chart whose `garment_type` is
compatible (shirt-to-shirt, blazer-to-jacket) and whose measurements fall
within per-dimension tolerance (chest ±1.25", length ±1.5", shoulder ±1",
sleeve ±1.25"). See `backend/app/cross_match/engine.py`.

## Pipeline

```
URL / tag image
   ↓
SourceGarment              ← marketplace HTML extractor + tag OCR
   ↓
Photo features             ← vision model reads listing photos
   ↓                          (collar, fabric, buttons, label aging)
Era inference              ← tag markers + photo signals + brand KB eras
   ↓                          (highest weighted era_label wins)
FitProfile                 ← brand + line + era + size, seller-stated dims
   ↓
Canonical measurements     ← sizing KB lookup for (brand, line, era, size)
   ↓
Cross-matches              ← other charts within per-dim tolerance
   ↓
MarketplaceQuery[]         ← per-site queries for source + each cross-match
```

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
