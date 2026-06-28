"""Grailed listing extractor.

Grailed is the highest-signal source for menswear-vintage — they expose a
'measurements' object as structured data (chest, length, sleeve, shoulder)
in addition to brand/sub-designer.
"""

from __future__ import annotations

import json
import re
from typing import Any

from pydantic import HttpUrl
from selectolax.parser import HTMLParser

from ..schemas import Confidence, Marketplace, Measurement, Signal, SourceGarment
from ._common import parse_og_meta


_INITIAL_STATE_RE = re.compile(
    r"window\.__PRELOADED_STATE__\s*=\s*(\{.+?\})\s*;\s*</script", re.S
)


def _walk(value: Any, key: str) -> Any:
    if isinstance(value, dict):
        if key in value:
            return value[key]
        for v in value.values():
            found = _walk(v, key)
            if found is not None:
                return found
    elif isinstance(value, list):
        for item in value:
            found = _walk(item, key)
            if found is not None:
                return found
    return None


_MEASUREMENT_KEYS = {
    "measurements_chest": "chest",
    "measurements_length": "length",
    "measurements_shoulders": "shoulder",
    "measurements_sleeves": "sleeve",
    "measurements_waist": "waist",
    "measurements_inseam": "inseam",
    "measurements_rise": "rise",
}


def extract(*, url: str, html: str, marketplace: Marketplace) -> SourceGarment:
    tree = HTMLParser(html)
    og = parse_og_meta(tree)
    title = og.title
    description = og.description

    state: dict[str, Any] | None = None
    match = _INITIAL_STATE_RE.search(html)
    if match:
        try:
            state = json.loads(match.group(1))
        except (json.JSONDecodeError, ValueError):
            state = None

    brand_value: str | None = None
    size_value: str | None = None
    photo_urls: list[str] = list(og.image_urls or [])
    measurements: list[Measurement] = []
    designers: list[str] = []

    if state:
        listing = _walk(state, "listing") or state
        title = _walk(listing, "title") or title
        description = _walk(listing, "description") or description
        size_value = _walk(listing, "size") or size_value
        for raw_key, name in _MEASUREMENT_KEYS.items():
            v = _walk(listing, raw_key)
            try:
                f = float(v) if v is not None else None
            except (TypeError, ValueError):
                f = None
            if f and 1 < f < 200:
                measurements.append(
                    Measurement(
                        name=name,  # type: ignore[arg-type]
                        value=f,
                        unit="in",
                        source="grailed:listing.measurements",
                        confidence=Confidence.high,
                    )
                )
        ds = _walk(listing, "designers") or []
        if isinstance(ds, list):
            for d in ds:
                if isinstance(d, dict) and isinstance(d.get("name"), str):
                    designers.append(d["name"])
                elif isinstance(d, str):
                    designers.append(d)
        if designers:
            brand_value = designers[0]
        photos = _walk(listing, "photos") or []
        if isinstance(photos, list):
            for p in photos:
                if isinstance(p, dict):
                    candidate = p.get("url") or p.get("medium") or p.get("large")
                    if isinstance(candidate, str):
                        photo_urls.append(candidate)

    return SourceGarment(
        source_kind="url",
        source_url=HttpUrl(url),
        marketplace=marketplace,
        title=title,
        description=description,
        photo_urls=[HttpUrl(u) for u in dict.fromkeys(photo_urls)],
        brand=(
            Signal(value=brand_value, confidence=Confidence.high, source="grailed:designers")
            if brand_value
            else None
        ),
        line=(
            Signal(
                value=" / ".join(designers[1:3]),
                confidence=Confidence.medium,
                source="grailed:designers",
            )
            if len(designers) > 1
            else None
        ),
        size=(
            Signal(value=size_value, confidence=Confidence.high, source="grailed:listing.size")
            if size_value
            else None
        ),
        raw_seller_size_label=size_value,
        measurements=measurements,
    )
