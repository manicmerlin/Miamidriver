"""Depop listing extractor.

Depop SSRs a Next.js shell and hydrates from a `__NEXT_DATA__` JSON blob. We
prefer that blob (stable shape) and fall back to OG meta tags if it's missing
or anti-bot has stripped it. Brand and size land in the JSON; measurements
sit in the free-text description.
"""

from __future__ import annotations

import json
from typing import Any

from pydantic import HttpUrl
from selectolax.parser import HTMLParser

from ..schemas import Confidence, GarmentType, Marketplace, Signal, SourceGarment
from ._common import parse_measurements, parse_og_meta


_GARMENT_KEYWORDS = {
    GarmentType.shirt: ["button down", "button-down", "oxford", "flannel", "dress shirt"],
    GarmentType.polo: ["polo"],
    GarmentType.tshirt: ["t-shirt", "tee", "tshirt"],
    GarmentType.sweater: ["sweater", "knit", "cardigan", "jumper"],
    GarmentType.jacket: ["jacket", "bomber", "windbreaker"],
    GarmentType.coat: ["coat", "overcoat", "trench"],
    GarmentType.pants: ["pants", "trousers", "chinos", "jeans"],
    GarmentType.shorts: ["shorts"],
    GarmentType.suit: ["suit"],
    GarmentType.blazer: ["blazer", "sport coat", "sportcoat"],
}


def _classify_garment(text: str | None) -> GarmentType:
    if not text:
        return GarmentType.unknown
    lower = text.lower()
    for gt, kws in _GARMENT_KEYWORDS.items():
        if any(kw in lower for kw in kws):
            return gt
    return GarmentType.unknown


def _walk(value: Any, key: str) -> Any:
    """Find the first occurrence of `key` anywhere in a nested JSON-ish structure."""
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


def extract(*, url: str, html: str, marketplace: Marketplace) -> SourceGarment:
    tree = HTMLParser(html)
    og = parse_og_meta(tree)
    next_data: dict[str, Any] | None = None
    node = tree.css_first("script#__NEXT_DATA__")
    if node:
        try:
            next_data = json.loads(node.text())
        except (json.JSONDecodeError, ValueError):
            next_data = None

    title = og.title
    description = og.description
    brand_value: str | None = None
    size_value: str | None = None
    photo_urls: list[str] = list(og.image_urls or [])

    if next_data:
        product = _walk(next_data, "product") or next_data
        title = _walk(product, "description") or title
        description = _walk(product, "description") or description
        brand_value = _walk(product, "brandName") or _walk(product, "brand")
        size_value = _walk(product, "size") or _walk(product, "sizeName")
        pics = _walk(product, "pictures") or _walk(product, "pictureData") or []
        if isinstance(pics, list):
            for p in pics:
                if isinstance(p, dict):
                    candidate = p.get("url") or p.get("large") or p.get("original")
                    if isinstance(candidate, str):
                        photo_urls.append(candidate)

    measurements = parse_measurements(description)

    brand_signal = None
    if brand_value:
        brand_signal = Signal(
            value=str(brand_value),
            confidence=Confidence.high,
            source="depop:product.brand",
        )

    size_signal = None
    if size_value:
        size_signal = Signal(
            value=str(size_value),
            confidence=Confidence.high,
            source="depop:product.size",
        )

    return SourceGarment(
        source_kind="url",
        source_url=HttpUrl(url),
        marketplace=marketplace,
        title=title,
        description=description,
        photo_urls=[HttpUrl(u) for u in dict.fromkeys(photo_urls)],  # de-dup, preserve order
        brand=brand_signal,
        garment_type=_classify_garment(f"{title or ''} {description or ''}"),
        size=size_signal,
        raw_seller_size_label=str(size_value) if size_value else None,
        measurements=measurements,
    )
