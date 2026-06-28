"""Mercari listing extractor — relies on Next.js JSON + OG fallbacks."""

from __future__ import annotations

import json
from typing import Any

from pydantic import HttpUrl
from selectolax.parser import HTMLParser

from ..schemas import Confidence, Marketplace, Signal, SourceGarment
from ._common import parse_measurements, parse_og_meta


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


def extract(*, url: str, html: str, marketplace: Marketplace) -> SourceGarment:
    tree = HTMLParser(html)
    og = parse_og_meta(tree)
    title = og.title
    description = og.description

    next_data: dict[str, Any] | None = None
    node = tree.css_first("script#__NEXT_DATA__")
    if node:
        try:
            next_data = json.loads(node.text())
        except (json.JSONDecodeError, ValueError):
            next_data = None

    brand_value: str | None = None
    size_value: str | None = None
    photo_urls: list[str] = list(og.image_urls or [])

    if next_data:
        item = _walk(next_data, "item") or next_data
        title = _walk(item, "name") or title
        description = _walk(item, "description") or description
        brand = _walk(item, "itemBrand")
        if isinstance(brand, dict):
            brand_value = brand.get("name") or brand_value
        size = _walk(item, "itemSize")
        if isinstance(size, dict):
            size_value = size.get("name") or size_value
        photos = _walk(item, "photos") or []
        if isinstance(photos, list):
            for p in photos:
                if isinstance(p, dict):
                    candidate = p.get("originalImageUrl") or p.get("uri") or p.get("url")
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
            Signal(value=brand_value, confidence=Confidence.high, source="mercari:item.brand")
            if brand_value
            else None
        ),
        size=(
            Signal(value=size_value, confidence=Confidence.high, source="mercari:item.size")
            if size_value
            else None
        ),
        raw_seller_size_label=size_value,
        measurements=parse_measurements(description),
    )
