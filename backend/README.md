# VintageFit backend

FastAPI service that turns a marketplace URL or tag photo into a portable
"fits me" profile + per-marketplace search queries.

## Install / run

```sh
python -m venv .venv
.venv/bin/pip install -e ".[dev]"
.venv/bin/uvicorn app.main:app --reload
```

OpenAPI docs at http://localhost:8000/docs.

## Layout

```
app/
├── main.py              # FastAPI app factory + /health
├── config.py            # pydantic-settings — reads .env
├── schemas.py           # SourceGarment, FitProfile, MarketplaceQuery, …
├── routes/
│   └── ingest.py        # POST /v1/ingest (multipart: url and/or image)
├── ingestion/
│   ├── url_parser.py    # detect marketplace + fetch HTML
│   ├── depop.py         # __NEXT_DATA__ extractor
│   ├── ebay.py          # JSON-LD + item-specifics extractor
│   ├── mercari.py
│   ├── poshmark.py
│   ├── grailed.py       # __PRELOADED_STATE__ + structured measurements
│   ├── generic.py       # OG + JSON-LD fallback for unknown sites
│   └── _common.py       # measurement regexes, OG-meta helpers
├── vision/
│   └── tag_ocr.py       # Anthropic vision (or stub) → SourceGarment
├── brands/
│   ├── knowledge_base.py
│   └── data/
│       ├── j_crew.yaml
│       ├── christian_dior_monsieur.yaml
│       └── _generic.yaml
├── profile/
│   └── builder.py       # SourceGarments → FitProfile (era resolution, etc.)
└── search_terms/
    └── generator.py     # FitProfile → MarketplaceQuery[]
```

## Tests

```sh
.venv/bin/pytest -q
```

Tests cover the search-term generator, measurement regex, URL detection, and
profile assembly. Marketplace scrapers are integration-tested only — they
hit live HTML, which would make CI brittle.

## Adding a brand

Drop a YAML file in `app/brands/data/`. See `j_crew.yaml` for the shape.

The `tag_markers` field is the most important — it's what `profile/builder.py`
uses to resolve era from country-of-origin signals.
