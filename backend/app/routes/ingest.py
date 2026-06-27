"""POST /v1/ingest — single entrypoint for URL- or image-driven ingestion.

The iOS client should send EITHER `url` (multipart text field) OR `image`
(multipart file), not both. We honor both if both are present by merging
signals into a single profile.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..ingestion import fetch_source_garment
from ..profile import build_fit_profile
from ..schemas import IngestResponse, SourceGarment
from ..search_terms import generate_queries
from ..vision import classify_tag_image


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
        except Exception as exc:  # network / parse failure
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

    profile = build_fit_profile(sources)
    if notes:
        profile.notes.append(notes)
    queries = generate_queries(profile)

    return IngestResponse(source=sources[0], profile=profile, queries=queries)
