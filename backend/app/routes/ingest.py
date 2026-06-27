"""POST /v1/ingest — single entrypoint for URL- or image-driven ingestion.

Pipeline:
  1. Fetch the listing page (if URL) and/or run vision OCR on tag photo.
     Both yield SourceGarment fragments which we keep separately.
  2. Optionally run photo-feature vision over the listing's photo URLs to
     get era-corroborating signals (collar style, fabric pattern, etc.).
  3. Resolve era using brand KB tag-markers + photo signals.
  4. Build the FitProfile.
  5. Look up canonical measurements from the sizing KB for the resolved
     (brand, line, era, size) combo.
  6. Find cross-match candidates whose canonical sizing is similar.
  7. Generate per-marketplace search queries for the source garment AND for
     each cross-match candidate.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..brands import lookup_brand
from ..cross_match import find_cross_matches
from ..ingestion import fetch_source_garment
from ..profile import build_fit_profile, resolve_era
from ..schemas import (
    CrossMatchCandidate,
    FitProfile,
    GarmentType,
    IngestResponse,
    Marketplace,
    SourceGarment,
)
from ..search_terms import generate_queries
from ..sizing import canonical_measurements, lookup_size_chart
from ..vision import analyze_photos, classify_tag_image


router = APIRouter(prefix="/v1", tags=["ingest"])
log = logging.getLogger(__name__)


@router.post("/ingest", response_model=IngestResponse)
async def ingest(
    url: str | None = Form(default=None),
    notes: str | None = Form(default=None),
    image: UploadFile | None = File(default=None),
) -> IngestResponse:
    if not url and image is None:
        raise HTTPException(
            status_code=400,
            detail="Provide a marketplace URL, a tag image, or both.",
        )

    sources: list[SourceGarment] = []

    if url:
        try:
            sources.append(await fetch_source_garment(url))
        except Exception as exc:
            log.warning("URL ingestion failed for %s: %s", url, exc)
            raise HTTPException(
                status_code=502,
                detail=f"Could not fetch or parse listing: {exc}",
            ) from exc

    if image is not None:
        contents = await image.read()
        try:
            sources.append(
                await classify_tag_image(contents, mime_type=image.content_type or "image/jpeg")
            )
        except Exception as exc:
            log.warning("Tag OCR failed: %s", exc)
            raise HTTPException(status_code=502, detail=f"Tag OCR failed: {exc}") from exc

    # Step 2: photo feature analysis (opportunistic — failures are non-fatal).
    primary = sources[0]
    brand_hint = primary.brand.value if primary.brand else None
    photo_urls = [str(u) for u in primary.photo_urls]
    photo_features, photo_signals = await analyze_photos(photo_urls, brand_hint=brand_hint)

    # Step 3: explicit era inference (also returns the signals we used)
    brand_record = lookup_brand(brand_hint)
    era_inference = resolve_era(primary, brand_record, photo_signals)

    # Step 4: assemble the FitProfile, feeding it the photo signals so its
    # internal era resolution matches what we return at the top level.
    profile: FitProfile = build_fit_profile(sources, extra_era_signals=photo_signals)
    if notes:
        profile.notes.append(notes)

    # Step 5: canonical sizing lookup
    chart_entry = lookup_size_chart(
        brand=profile.brand,
        line=profile.line,
        era_label=profile.era_label,
        garment_type=profile.garment_type,
        size_label=profile.size_label,
    )
    canonical = canonical_measurements(chart_entry)

    # Step 6: cross-matches — use canonical measurements when we have them,
    # otherwise fall back to seller-stated measurements from the profile.
    measurements_for_match = canonical or profile.measurements
    exclude = None
    if profile.brand and profile.line and profile.era_label and profile.size_label:
        exclude = (profile.brand, profile.line, profile.era_label, profile.size_label)
    cross_matches: list[CrossMatchCandidate] = find_cross_matches(
        source_measurements=measurements_for_match,
        source_garment_type=profile.garment_type,
        exclude=exclude,
    )

    # Per-cross-match search queries: build a synthetic FitProfile for each
    # candidate and run it through the existing query generator. The first
    # query of the depop bundle is the best targeted string.
    for cm in cross_matches:
        synthetic = FitProfile(
            id="synthetic",
            derived_from=[],
            brand=cm.entry.brand,
            line=cm.entry.line,
            era_label=cm.entry.era_label,
            garment_type=cm.entry.garment_type,
            size_label=cm.entry.size_label,
        )
        depop = next(
            (q for q in generate_queries(synthetic) if q.marketplace == Marketplace.depop),
            None,
        )
        cm.query = depop

    queries = generate_queries(profile)

    return IngestResponse(
        source=primary,
        profile=profile,
        queries=queries,
        era_inference=era_inference,
        canonical_measurements=canonical,
        photo_features=photo_features if (photo_urls or photo_features.raw_response) else None,
        cross_matches=cross_matches,
    )
